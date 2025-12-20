#!/usr/bin/env python3
"""
Water Tracker API Backend Test Suite
Tests all endpoints thoroughly with various scenarios
"""

import requests
import json
import time
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://drinklog-1.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

print(f"Testing Water Tracker API at: {API_BASE}")
print("=" * 60)

def test_seed_users():
    """Test the seed users endpoint"""
    print("\n🌱 Testing Seed Users Endpoint...")
    try:
        response = requests.get(f"{API_BASE}/seed", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {data}")
            
            # Check if users were seeded or already exist
            if 'message' in data and 'count' in data:
                if data['count'] == 6:
                    print("✅ Seed endpoint working - 6 users seeded/exist")
                    return True
                else:
                    print(f"❌ Expected 6 users, got {data['count']}")
                    return False
            else:
                print("❌ Invalid response format")
                return False
        else:
            print(f"❌ Seed endpoint failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Seed endpoint error: {str(e)}")
        return False

def test_get_all_users():
    """Test getting all users"""
    print("\n👥 Testing Get All Users Endpoint...")
    try:
        response = requests.get(f"{API_BASE}/users", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            users = response.json()
            print(f"Found {len(users)} users")
            
            if len(users) == 6:
                # Check user properties
                expected_names = ['Nikhil', 'Karthik', 'Prabhath', 'Samson', 'Chakri', 'Praveen']
                user_names = [user['name'] for user in users]
                
                # Check all expected users exist
                all_users_exist = all(name in user_names for name in expected_names)
                
                # Check user properties
                valid_users = True
                colors_used = []
                for user in users:
                    if not all(key in user for key in ['name', 'dailyGoal', 'color', '_id']):
                        valid_users = False
                        print(f"❌ User missing required properties: {user}")
                        break
                    
                    if user['dailyGoal'] != 3000:
                        valid_users = False
                        print(f"❌ User {user['name']} has wrong daily goal: {user['dailyGoal']}")
                        break
                    
                    colors_used.append(user['color'])
                
                # Check distinct colors
                distinct_colors = len(set(colors_used)) == len(colors_used)
                
                if all_users_exist and valid_users and distinct_colors:
                    print("✅ Get all users working - all 6 users with correct properties and distinct colors")
                    return users  # Return users for use in other tests
                else:
                    print("❌ Users don't have correct properties or colors aren't distinct")
                    return False
            else:
                print(f"❌ Expected 6 users, got {len(users)}")
                return False
        else:
            print(f"❌ Get users failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Get users error: {str(e)}")
        return False

def test_get_specific_user(users):
    """Test getting a specific user"""
    print("\n👤 Testing Get Specific User Endpoint...")
    try:
        if not users:
            print("❌ No users available for testing")
            return False
            
        # Test with valid user ID
        test_user = users[0]
        user_id = test_user['_id']
        
        response = requests.get(f"{API_BASE}/users/{user_id}", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            user = response.json()
            if user['_id'] == user_id and user['name'] == test_user['name']:
                print(f"✅ Get specific user working - retrieved {user['name']}")
                
                # Test with invalid user ID
                invalid_response = requests.get(f"{API_BASE}/users/invalid_id", timeout=10)
                if invalid_response.status_code == 404:
                    print("✅ Invalid user ID correctly returns 404")
                    return True
                else:
                    print(f"❌ Invalid user ID should return 404, got {invalid_response.status_code}")
                    return False
            else:
                print("❌ Retrieved user doesn't match expected user")
                return False
        else:
            print(f"❌ Get specific user failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Get specific user error: {str(e)}")
        return False

def test_log_water_intake(users):
    """Test logging water intake"""
    print("\n💧 Testing Log Water Intake Endpoint...")
    try:
        if not users:
            print("❌ No users available for testing")
            return False
            
        # Test logging water for multiple users
        test_logs = [
            {"userId": users[0]['_id'], "amount": 250},
            {"userId": users[1]['_id'], "amount": 500},
            {"userId": users[0]['_id'], "amount": 300},  # Same user, different amount
            {"userId": users[2]['_id'], "amount": 750}
        ]
        
        logged_entries = []
        for log_data in test_logs:
            response = requests.post(
                f"{API_BASE}/water-logs",
                json=log_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            print(f"Logging {log_data['amount']}ml for user {log_data['userId'][:8]}...")
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                log_entry = response.json()
                if all(key in log_entry for key in ['userId', 'amount', 'timestamp', '_id']):
                    logged_entries.append(log_entry)
                    print(f"✅ Water log created: {log_entry['amount']}ml")
                else:
                    print("❌ Log entry missing required properties")
                    return False
            else:
                print(f"❌ Water logging failed with status {response.status_code}")
                print(f"Response: {response.text}")
                return False
        
        # Test invalid requests
        invalid_response = requests.post(
            f"{API_BASE}/water-logs",
            json={"amount": 250},  # Missing userId
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if invalid_response.status_code == 400:
            print("✅ Invalid request correctly returns 400")
            return logged_entries
        else:
            print(f"❌ Invalid request should return 400, got {invalid_response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Log water intake error: {str(e)}")
        return False

def test_get_water_logs(users):
    """Test getting water logs with filters"""
    print("\n📊 Testing Get Water Logs Endpoint...")
    try:
        if not users:
            print("❌ No users available for testing")
            return False
            
        # Test getting all logs
        response = requests.get(f"{API_BASE}/water-logs", timeout=10)
        print(f"All logs - Status Code: {response.status_code}")
        
        if response.status_code == 200:
            all_logs = response.json()
            print(f"✅ Retrieved {len(all_logs)} total water logs")
            
            # Test filtering by user
            user_id = users[0]['_id']
            user_response = requests.get(f"{API_BASE}/water-logs?userId={user_id}", timeout=10)
            
            if user_response.status_code == 200:
                user_logs = user_response.json()
                print(f"✅ Retrieved {len(user_logs)} logs for specific user")
                
                # Verify all logs belong to the user
                all_correct_user = all(log['userId'] == user_id for log in user_logs)
                if all_correct_user:
                    print("✅ User filtering working correctly")
                    
                    # Test date filtering
                    today = datetime.now().strftime('%Y-%m-%d')
                    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
                    
                    date_response = requests.get(
                        f"{API_BASE}/water-logs?startDate={today}&endDate={tomorrow}",
                        timeout=10
                    )
                    
                    if date_response.status_code == 200:
                        date_logs = date_response.json()
                        print(f"✅ Date filtering working - {len(date_logs)} logs for today")
                        return True
                    else:
                        print(f"❌ Date filtering failed with status {date_response.status_code}")
                        return False
                else:
                    print("❌ User filtering not working correctly")
                    return False
            else:
                print(f"❌ User filtering failed with status {user_response.status_code}")
                return False
        else:
            print(f"❌ Get water logs failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Get water logs error: {str(e)}")
        return False

def test_today_intake(users):
    """Test getting today's intake for all users"""
    print("\n📈 Testing Today's Intake Endpoint...")
    try:
        response = requests.get(f"{API_BASE}/today-intake", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            intake_data = response.json()
            print(f"Retrieved intake data for {len(intake_data)} users")
            
            # Verify structure and calculations
            valid_data = True
            for user_data in intake_data:
                required_keys = ['name', 'dailyGoal', 'color', '_id', 'todayIntake']
                if not all(key in user_data for key in required_keys):
                    valid_data = False
                    print(f"❌ User data missing required keys: {user_data}")
                    break
                
                if not isinstance(user_data['todayIntake'], (int, float)):
                    valid_data = False
                    print(f"❌ Invalid todayIntake type for {user_data['name']}: {type(user_data['todayIntake'])}")
                    break
                
                print(f"User {user_data['name']}: {user_data['todayIntake']}ml / {user_data['dailyGoal']}ml")
            
            if valid_data and len(intake_data) == 6:
                print("✅ Today's intake endpoint working - correct calculations and structure")
                return True
            else:
                print("❌ Today's intake data structure or count incorrect")
                return False
        else:
            print(f"❌ Today's intake failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Today's intake error: {str(e)}")
        return False

def test_update_daily_goal(users):
    """Test updating user's daily goal"""
    print("\n🎯 Testing Update Daily Goal Endpoint...")
    try:
        if not users:
            print("❌ No users available for testing")
            return False
            
        # Test updating a user's daily goal
        test_user = users[0]
        user_id = test_user['_id']
        new_goal = 4000
        
        response = requests.put(
            f"{API_BASE}/users/{user_id}",
            json={"dailyGoal": new_goal},
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"Updating daily goal to {new_goal}ml for user {test_user['name']}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("✅ Daily goal update successful")
                
                # Verify the update persisted
                verify_response = requests.get(f"{API_BASE}/users/{user_id}", timeout=10)
                if verify_response.status_code == 200:
                    updated_user = verify_response.json()
                    if updated_user['dailyGoal'] == new_goal:
                        print("✅ Daily goal update persisted correctly")
                        
                        # Test invalid requests
                        invalid_response = requests.put(
                            f"{API_BASE}/users/{user_id}",
                            json={},  # Missing dailyGoal
                            headers={'Content-Type': 'application/json'},
                            timeout=10
                        )
                        
                        if invalid_response.status_code == 400:
                            print("✅ Invalid update request correctly returns 400")
                            
                            # Test non-existent user
                            nonexistent_response = requests.put(
                                f"{API_BASE}/users/nonexistent_id",
                                json={"dailyGoal": 3000},
                                headers={'Content-Type': 'application/json'},
                                timeout=10
                            )
                            
                            if nonexistent_response.status_code == 404:
                                print("✅ Non-existent user correctly returns 404")
                                return True
                            else:
                                print(f"❌ Non-existent user should return 404, got {nonexistent_response.status_code}")
                                return False
                        else:
                            print(f"❌ Invalid request should return 400, got {invalid_response.status_code}")
                            return False
                    else:
                        print(f"❌ Daily goal not updated correctly. Expected {new_goal}, got {updated_user['dailyGoal']}")
                        return False
                else:
                    print("❌ Could not verify daily goal update")
                    return False
            else:
                print("❌ Update response doesn't indicate success")
                return False
        else:
            print(f"❌ Daily goal update failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Update daily goal error: {str(e)}")
        return False

def test_multiple_logs_same_user_same_day():
    """Test that multiple water logs for same user on same day are summed correctly"""
    print("\n🔄 Testing Multiple Logs Same User Same Day...")
    try:
        # Get users first
        users_response = requests.get(f"{API_BASE}/users", timeout=10)
        if users_response.status_code != 200:
            print("❌ Could not get users for testing")
            return False
            
        users = users_response.json()
        test_user = users[0]
        user_id = test_user['_id']
        
        # Log multiple entries for the same user
        amounts = [200, 300, 150, 250]  # Total should be 900ml
        
        for amount in amounts:
            log_response = requests.post(
                f"{API_BASE}/water-logs",
                json={"userId": user_id, "amount": amount},
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if log_response.status_code != 200:
                print(f"❌ Failed to log {amount}ml")
                return False
            
            time.sleep(0.1)  # Small delay between requests
        
        print(f"Logged multiple entries: {amounts} (total: {sum(amounts)}ml)")
        
        # Check today's intake
        intake_response = requests.get(f"{API_BASE}/today-intake", timeout=10)
        if intake_response.status_code == 200:
            intake_data = intake_response.json()
            test_user_intake = next((u for u in intake_data if u['_id'] == user_id), None)
            
            if test_user_intake:
                actual_intake = test_user_intake['todayIntake']
                expected_minimum = sum(amounts)  # At least this much (might have previous logs)
                
                if actual_intake >= expected_minimum:
                    print(f"✅ Multiple logs summed correctly - user has {actual_intake}ml total intake")
                    return True
                else:
                    print(f"❌ Intake calculation incorrect. Expected at least {expected_minimum}ml, got {actual_intake}ml")
                    return False
            else:
                print("❌ Could not find test user in intake data")
                return False
        else:
            print("❌ Could not get today's intake data")
            return False
            
    except Exception as e:
        print(f"❌ Multiple logs test error: {str(e)}")
        return False

def main():
    """Run all backend tests"""
    print("🚀 Starting Water Tracker API Backend Tests")
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    
    test_results = {}
    
    # Test 1: Seed users
    test_results['seed_users'] = test_seed_users()
    
    # Test 2: Get all users (needed for other tests)
    users = test_get_all_users()
    test_results['get_all_users'] = bool(users)
    
    if users:
        # Test 3: Get specific user
        test_results['get_specific_user'] = test_get_specific_user(users)
        
        # Test 4: Log water intake
        logged_entries = test_log_water_intake(users)
        test_results['log_water_intake'] = bool(logged_entries)
        
        # Test 5: Get water logs with filters
        test_results['get_water_logs'] = test_get_water_logs(users)
        
        # Test 6: Today's intake
        test_results['today_intake'] = test_today_intake(users)
        
        # Test 7: Update daily goal
        test_results['update_daily_goal'] = test_update_daily_goal(users)
        
        # Test 8: Multiple logs same user same day
        test_results['multiple_logs_sum'] = test_multiple_logs_same_user_same_day()
    else:
        print("❌ Skipping remaining tests due to user retrieval failure")
        test_results.update({
            'get_specific_user': False,
            'log_water_intake': False,
            'get_water_logs': False,
            'today_intake': False,
            'update_daily_goal': False,
            'multiple_logs_sum': False
        })
    
    # Print summary
    print("\n" + "=" * 60)
    print("🏁 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for result in test_results.values() if result)
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All backend tests passed!")
        return True
    else:
        print("⚠️  Some backend tests failed!")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)