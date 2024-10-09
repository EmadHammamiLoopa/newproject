import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {

  constructor() {}

  // Predefined categories for buying and selling
  getCategories(): Observable<string[]> {
    const categories = [
      'Electronics',
      'Jewelry',
      'Men\'s Clothing',
      'Women\'s Clothing',
      'Home Appliances',
      'Books',
      'Beauty Products',
      'Toys & Games',
      'Sports Gear',                  // Shortened from 'Sports Equipment'
      'Automotive',
      'Furniture',
      'Health Care',                  // Shortened from 'Health & Personal Care'
      'Garden & Outdoor',
      'Pet Supplies',
      'Office Supplies',
      'Groceries',
      'Musical Instruments',
      'Baby Products',
      'Tools & Improvement',          // Shortened from 'Tools & Home Improvement'
      'Smartphones & Accessories',
      'Computers & Accessories',
      'Video Games',
      'Cameras & Photography',
      'Wearable Tech',                // Shortened from 'Wearable Technology'
      'Luggage & Travel Gear',
      'Watches',
      'Handbags & Wallets',
      'Footwear',
      'Arts & Crafts',                // Shortened from 'Arts, Crafts & Sewing'
      'Kitchen & Dining',
      'Lighting',
      'Home Décor',
      'Bath & Bedding',
      'Heating & Air Quality',        // Shortened from 'Heating, Cooling & Air Quality'
      'Cleaning Supplies',
      'Storage & Organization',
      'Movies & TV',
      'Music',
      'Office Electronics',
      'Outdoor Gear',                 // Shortened from 'Outdoors & Adventure Gear'
      'Cycling',
      'Hunting & Fishing',
      'Camping & Hiking',
      'Skateboards & Scooters',       // Shortened from 'Skateboards, Scooters & Rollerblades'
      'Luxury Goods',
      'Vintage & Collectibles',
      'Party Supplies',
      'Costumes & Accessories',
      'Board Games & Puzzles',
      'Educational Supplies',
      'Scientific Gear',              // Shortened from 'Scientific Equipment'
      'Survival Gear',
      'Gourmet Food & Drink',
      'Gift Cards & Vouchers',
      'Religious Items',
      'Ethnic Clothing',              // Shortened from 'Ethnic & Cultural Clothing'
      'Wedding Supplies',             // Shortened from 'Wedding & Event Supplies'
      'Eco-Friendly Products',        // Shortened from 'Green & Eco-Friendly Products'
      'DIY Kits',                     // Shortened from 'DIY & Crafting Kits'
      'Photography Equipment',        // Shortened from 'Photography & Videography Equipment'
      'Fitness Equipment'             // Shortened from 'Fitness & Exercise Equipment'
    ];
    
  
    return of(categories);
    
  }
}
