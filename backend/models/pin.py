from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId
import os

class Pin:
    def __init__(self, mongodb_uri):
        self.client = MongoClient(mongodb_uri)
        self.db = self.client.carousel
        self.collection = self.db.pins
    
    def create_pin(self, title, image_url, tags=None):
        """Create a new pin"""
        pin_data = {
            'title': title,
            'image_url': image_url,
            'tags': tags or [],
            'created_at': datetime.utcnow()
        }
        result = self.collection.insert_one(pin_data)
        return str(result.inserted_id)
    
    def get_all_pins(self):
        """Get all pins sorted by creation date (newest first)"""
        pins = list(self.collection.find().sort('created_at', -1))
        # Convert ObjectId to string for JSON serialization
        for pin in pins:
            pin['_id'] = str(pin['_id'])
            pin['created_at'] = pin['created_at'].isoformat()
        return pins
    
    def get_pin_by_id(self, pin_id):
        """Get a specific pin by ID"""
        try:
            pin = self.collection.find_one({'_id': ObjectId(pin_id)})
            if pin:
                pin['_id'] = str(pin['_id'])
                pin['created_at'] = pin['created_at'].isoformat()
            return pin
        except:
            return None
    
    def delete_pin(self, pin_id):
        """Delete a pin by ID"""
        try:
            result = self.collection.delete_one({'_id': ObjectId(pin_id)})
            return result.deleted_count > 0
        except:
            return False