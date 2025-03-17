import { User } from 'src/app/models/User';
import { IonInfiniteScroll } from '@ionic/angular';
import { Comment } from '../../../../models/Comment';
import { ToastService } from './../../../../services/toast.service';
import { ChannelService } from './../../../../services/channel.service';
import { Post } from './../../../../models/Post';
import { Component, EventEmitter, HostListener, Input, OnInit, Output, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NativeStorage } from '@ionic-native/native-storage/ngx';
import { getCommentUserName } from './comment-utils';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-comments',
  templateUrl: './comments.component.html',
  styleUrls: ['./comments.component.scss'],
})
export class CommentsComponent implements OnInit {

  @ViewChild('infinitScroll') infinitScroll: IonInfiniteScroll;
  @HostListener('document:click', ['$event'])
  onClickOutside(event) {
    if (!event.target.closest('.tag-dropdown')) {
      this.tagging = false;
    }
  }
  
  @Output() addComment = new EventEmitter();
  post: Post;
  postId: string;
  user: User;

  anonyme = false;

  commentText = "";
  mediaFile: File | null = null; // Store the selected media file
  mediaPreview: any = "";
  comments: Comment[];

  page = 0;
  pageLoading = false;

  constructor(private channelService: ChannelService, private toastService: ToastService, private route: ActivatedRoute, private nativeStorage: NativeStorage,private sanitizer: DomSanitizer  ) { }

  ngOnInit() {
    this.getUserData();
  }

  ionViewWillEnter(){
    this.pageLoading = true;
    this.getPostId();
  }

  
  private getUserData() {
    this.nativeStorage.getItem('user')
      .then(
        user => {
          this.user = new User().initialize(user);
        }
      )
      .catch(error => {
        console.warn('Error fetching user data from NativeStorage:', error);
        this.fetchUserFromLocalStorage();
      });
  }



  commentUserName(comment: Comment) {
    return comment.anonymName || `${comment.user.firstName} ${comment.user.lastName}`;
}

  
  getTaggableUsers(): Array<{ name: string, id: string }> {
    const taggableUsersMap = new Map<string, { name: string, id: string }>();
  
    // Add the post author if not the current user
    if (this.post && this.post.user._id !== this.user._id) {
      const authorName = this.post.anonyme ? this.post.anonymName : `${this.post.user.firstName} ${this.post.user.lastName}`;
      taggableUsersMap.set(`${this.post.user._id}-${this.post.anonyme}`, {
        name: authorName,
        id: this.post.user._id
      });
    }
  
    // Add the users from comments, considering both anonymous and real identities
    if (this.comments && this.comments.length > 0) {
      this.comments.forEach(comment => {
        const identityKey = `${comment.user._id}-${comment.anonyme}`;
        if (comment.user._id !== this.user._id && !taggableUsersMap.has(identityKey)) {
          taggableUsersMap.set(identityKey, {
            name: this.commentUserName(comment),
            id: comment.user._id
          });
        }
      });
    }
  
    // Convert the map values to an array and return
    return Array.from(taggableUsersMap.values());
  }
  
  
 
  
  filteredTaggableUsers: Array<{name: string, id: string}> = [];
tagging = false;

onKeyDown(event: KeyboardEvent) {
  if (event.key === '@') {
    this.tagging = true;
    this.filteredTaggableUsers = this.getTaggableUsers();
  } else if (this.tagging) {
    const query = this.commentText.split('@').pop();
    this.filteredTaggableUsers = this.getTaggableUsers().filter(user =>
      user.name.toLowerCase().includes(query.toLowerCase())
    );

    // Check if "@" is removed or no query after "@"
    if (!this.commentText.includes('@') || query === '') {
      this.tagging = false;
    }
  }

  if (event.key === 'Escape') {
    this.tagging = false;
  }
}


selectUser(user) {
  const textParts = this.commentText.split('@');
  textParts[textParts.length - 1] = user.name + ' ';
  this.commentText = textParts.join('@');
  this.tagging = false;
}


  private fetchUserFromLocalStorage() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      this.user = new User().initialize(user);
    } else {
      console.log('User data not found in localStorage');
      // Handle the scenario where user data is not found
      // For example, redirect to login or handle initial setup
    }
  }

  getPostId(){
    this.route.paramMap.subscribe(
      params => {
        this.postId = params.get('id');
        this.getPost();
      }
    )
  }

  getPost(){
    this.channelService.getPost(this.postId).then(
      (resp: any) => {
        this.post = new Post().initialize(resp.data);
        this.getComments(null, true);
      },
      err => {
        this.pageLoading = false;
        this.toastService.presentStdToastr(err);
      }
    );
  }

  getComments(event?, refresh?) {
    if (!event) this.pageLoading = true;
    if (refresh) this.page = 0;
  
    this.channelService.getComments(this.post.id).then(
      (resp: any) => {
        console.log(resp);
  
        if (!event || refresh) {
          this.comments = []; // Clear comments array when refreshing
        }
  
        if (refresh) {
          this.infinitScroll.disabled = false;
        }
  
        if (event) {
          event.target.complete();
          if (!resp.data.more && !refresh) {
            event.target.disabled = true;
          }
        }
  
        // Push only new comments
        resp.data.comments.forEach(cmt => {
          if (!this.comments.some(existingComment => existingComment.id === cmt._id)) {
            this.comments.push(new Comment().initialize(cmt));
          }
        });
  
        this.pageLoading = false;
      },
      err => {
        this.pageLoading = false;
        this.toastService.presentStdToastr(err);
      }
    );
  }
  
  
  onMediaSelected(event) {
    const file = event.target.files[0];
    console.log("Selected file type:", file.type); // Log the file type for debugging
    if (file && this.isValidMedia(file)) {
      this.mediaFile = file;
      // Sanitize the blob URL
      this.mediaPreview = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file));
    } else {
      this.toastService.presentStdToastr('Invalid media file selected');
    }
  }
  

// Validate file type (image/video)
// Validate file type (image/video)
isValidMedia(file: File): boolean {
  const allowedTypes = [
    'image/png',    // PNG images
    'image/jpeg',   // JPEG images
    'image/jpg',    // JPG images
    'image/gif',    // GIF images (optional)
    'image/webp',   // WebP images
    'video/mp4',    // MP4 videos
    'video/webm',   // WebM videos (optional)
    'video/ogg',    // Ogg videos (optional)
    // Add more types if needed
  ];
  return allowedTypes.includes(file.type);
}

storeComment() {
  if (!this.commentText.trim() && !this.mediaFile) {
    this.toastService.presentStdToastr('Please add a comment or media before submitting.');
    return;
  }

  const formData = new FormData();
  formData.append('text', this.commentText.trim());
  formData.append('anonyme', this.anonyme.toString());
  if (this.mediaFile) {
      formData.append('media', this.mediaFile);
  }
  formData.forEach((value, key) => {
      console.log(`FormData key: ${key}, value:`, value);
  });

  this.channelService.storeComment(this.post.id, formData).subscribe(
    (resp: any) => {
      console.log('Comment added successfully:', resp);

      // Successfully added the comment
      this.comments.unshift(new Comment().initialize(resp.data));
      this.commentText = ""; // Reset the comment text
      this.mediaFile = null; // Reset the media file
      this.mediaPreview = ""; // Clear media preview

      this.toastService.presentStdToastr('Comment added successfully.');
    },
    (err) => {
      // Handle any errors
      console.error('Error adding comment:', err);
      const errorMessage = err.error?.errors?.text?.[0] || err.message || 'Failed to add comment';
      this.toastService.presentStdToastr(`Error adding comment: ${errorMessage}`);
    }
  );
}

onRemoveComment(index: number) {
  this.comments.splice(index, 1);
  // Additional logic if required
}


// Remove selected media file
removeMedia() {
  this.mediaFile = null;
  this.mediaPreview = ""; // Clear the preview UI (if any)
  this.toastService.presentStdToastr('Media file removed.');
}


}
