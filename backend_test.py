#!/usr/bin/env python3
"""
MyRentManager Backend API Testing Suite
Tests all backend APIs following the specified test flow.
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Base URL from environment
BASE_URL = "https://landlordpro-6.preview.emergentagent.com"

class MyRentManagerTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_data = {}
        self.results = {
            'settings': {'passed': 0, 'failed': 0, 'errors': []},
            'properties': {'passed': 0, 'failed': 0, 'errors': []},
            'tenants': {'passed': 0, 'failed': 0, 'errors': []},
            'payments': {'passed': 0, 'failed': 0, 'errors': []},
            'expenses': {'passed': 0, 'failed': 0, 'errors': []}
        }
    
    def log_result(self, api, test_name, success, message=""):
        """Log test result"""
        if success:
            self.results[api]['passed'] += 1
            print(f"✅ {api.upper()} - {test_name}: PASSED {message}")
        else:
            self.results[api]['failed'] += 1
            self.results[api]['errors'].append(f"{test_name}: {message}")
            print(f"❌ {api.upper()} - {test_name}: FAILED - {message}")
    
    def make_request(self, method, endpoint, data=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/{endpoint}"
        try:
            if method == 'GET':
                response = self.session.get(url)
            elif method == 'POST':
                response = self.session.post(url, json=data)
            elif method == 'PUT':
                response = self.session.put(url, json=data)
            elif method == 'DELETE':
                response = self.session.delete(url)
            
            return response
        except Exception as e:
            print(f"Request error for {method} {url}: {str(e)}")
            return None
    
    def test_settings_api(self):
        """Test Settings API - GET and PUT"""
        print("\n=== Testing Settings API ===")
        
        # Test GET settings (should auto-create if not exists)
        response = self.make_request('GET', 'settings')
        if response and response.status_code == 200:
            settings = response.json()
            if 'currency' in settings and 'notifications' in settings:
                self.log_result('settings', 'GET settings', True, f"Retrieved settings with currency: {settings.get('currency')}")
                self.test_data['settings_id'] = settings.get('id')
            else:
                self.log_result('settings', 'GET settings', False, "Missing required fields in response")
        else:
            self.log_result('settings', 'GET settings', False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test PUT settings
        update_data = {
            'currency': '€',
            'notifications': False
        }
        response = self.make_request('PUT', 'settings', update_data)
        if response and response.status_code == 200:
            updated_settings = response.json()
            if updated_settings.get('currency') == '€' and updated_settings.get('notifications') == False:
                self.log_result('settings', 'PUT settings', True, "Settings updated successfully")
            else:
                self.log_result('settings', 'PUT settings', False, "Settings not updated correctly")
        else:
            self.log_result('settings', 'PUT settings', False, f"Status: {response.status_code if response else 'No response'}")
    
    def test_properties_api(self):
        """Test Properties CRUD API"""
        print("\n=== Testing Properties API ===")
        
        # Test GET properties (initially empty)
        response = self.make_request('GET', 'properties')
        if response and response.status_code == 200:
            properties = response.json()
            self.log_result('properties', 'GET properties', True, f"Retrieved {len(properties)} properties")
        else:
            self.log_result('properties', 'GET properties', False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test POST create property
        property_data = {
            'name': 'Sunset Apartments',
            'address': '123 Main Street, Downtown',
            'type': 'Apartment',
            'monthlyRent': 1200.00,
            'status': 'Vacant'
        }
        response = self.make_request('POST', 'properties', property_data)
        if response and response.status_code == 201:
            created_property = response.json()
            if created_property.get('id') and created_property.get('name') == 'Sunset Apartments':
                self.log_result('properties', 'POST create property', True, f"Created property with ID: {created_property['id']}")
                self.test_data['property_id'] = created_property['id']
                self.test_data['property_name'] = created_property['name']
            else:
                self.log_result('properties', 'POST create property', False, "Missing ID or incorrect data in response")
        else:
            self.log_result('properties', 'POST create property', False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test PUT update property
        if 'property_id' in self.test_data:
            update_data = {
                'name': 'Sunset Luxury Apartments',
                'address': '123 Main Street, Downtown',
                'type': 'Apartment',
                'monthlyRent': 1350.00,
                'status': 'Vacant'
            }
            response = self.make_request('PUT', f'properties/{self.test_data["property_id"]}', update_data)
            if response and response.status_code == 200:
                updated_property = response.json()
                if updated_property.get('name') == 'Sunset Luxury Apartments' and updated_property.get('monthlyRent') == 1350.00:
                    self.log_result('properties', 'PUT update property', True, "Property updated successfully")
                    self.test_data['property_name'] = updated_property['name']
                else:
                    self.log_result('properties', 'PUT update property', False, "Property not updated correctly")
            else:
                self.log_result('properties', 'PUT update property', False, f"Status: {response.status_code if response else 'No response'}")
    
    def test_tenants_api(self):
        """Test Tenants CRUD API"""
        print("\n=== Testing Tenants API ===")
        
        # Test GET tenants (initially empty)
        response = self.make_request('GET', 'tenants')
        if response and response.status_code == 200:
            tenants = response.json()
            self.log_result('tenants', 'GET tenants', True, f"Retrieved {len(tenants)} tenants")
        else:
            self.log_result('tenants', 'GET tenants', False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test POST create tenant (should update property status to Occupied)
        if 'property_id' in self.test_data:
            lease_start = datetime.now().strftime('%Y-%m-%d')
            lease_end = (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d')
            
            tenant_data = {
                'name': 'John Smith',
                'email': 'john.smith@email.com',
                'phone': '+1-555-0123',
                'propertyId': self.test_data['property_id'],
                'propertyName': self.test_data['property_name'],
                'monthlyRent': 1350.00,
                'leaseStart': lease_start,
                'leaseEnd': lease_end,
                'rentStatus': 'Pending'
            }
            response = self.make_request('POST', 'tenants', tenant_data)
            if response and response.status_code == 201:
                created_tenant = response.json()
                if created_tenant.get('id') and created_tenant.get('name') == 'John Smith':
                    self.log_result('tenants', 'POST create tenant', True, f"Created tenant with ID: {created_tenant['id']}")
                    self.test_data['tenant_id'] = created_tenant['id']
                    self.test_data['tenant_name'] = created_tenant['name']
                    
                    # Verify property status changed to Occupied
                    prop_response = self.make_request('GET', 'properties')
                    if prop_response and prop_response.status_code == 200:
                        properties = prop_response.json()
                        target_property = next((p for p in properties if p['id'] == self.test_data['property_id']), None)
                        if target_property and target_property.get('status') == 'Occupied':
                            self.log_result('tenants', 'Property status update on tenant creation', True, "Property status changed to Occupied")
                        else:
                            self.log_result('tenants', 'Property status update on tenant creation', False, f"Property status is {target_property.get('status') if target_property else 'not found'}")
                else:
                    self.log_result('tenants', 'POST create tenant', False, "Missing ID or incorrect data in response")
            else:
                self.log_result('tenants', 'POST create tenant', False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test PUT update tenant
        if 'tenant_id' in self.test_data:
            update_data = {
                'name': 'John A. Smith',
                'email': 'john.a.smith@email.com',
                'phone': '+1-555-0123',
                'propertyId': self.test_data['property_id'],
                'propertyName': self.test_data['property_name'],
                'monthlyRent': 1350.00,
                'leaseStart': lease_start,
                'leaseEnd': lease_end,
                'rentStatus': 'Pending'
            }
            response = self.make_request('PUT', f'tenants/{self.test_data["tenant_id"]}', update_data)
            if response and response.status_code == 200:
                updated_tenant = response.json()
                if updated_tenant.get('name') == 'John A. Smith':
                    self.log_result('tenants', 'PUT update tenant', True, "Tenant updated successfully")
                    self.test_data['tenant_name'] = updated_tenant['name']
                else:
                    self.log_result('tenants', 'PUT update tenant', False, "Tenant not updated correctly")
            else:
                self.log_result('tenants', 'PUT update tenant', False, f"Status: {response.status_code if response else 'No response'}")
    
    def test_payments_api(self):
        """Test Payments API"""
        print("\n=== Testing Payments API ===")
        
        # Test GET payments (initially empty)
        response = self.make_request('GET', 'payments')
        if response and response.status_code == 200:
            payments = response.json()
            self.log_result('payments', 'GET payments', True, f"Retrieved {len(payments)} payments")
        else:
            self.log_result('payments', 'GET payments', False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test POST create payment (should update tenant rent status to Paid)
        if 'tenant_id' in self.test_data:
            payment_data = {
                'tenantId': self.test_data['tenant_id'],
                'tenantName': self.test_data['tenant_name'],
                'propertyId': self.test_data['property_id'],
                'propertyName': self.test_data['property_name'],
                'amount': 1350.00,
                'date': datetime.now().strftime('%Y-%m-%d'),
                'status': 'Paid'
            }
            response = self.make_request('POST', 'payments', payment_data)
            if response and response.status_code == 201:
                created_payment = response.json()
                if created_payment.get('id') and created_payment.get('amount') == 1350.00:
                    self.log_result('payments', 'POST create payment', True, f"Created payment with ID: {created_payment['id']}")
                    self.test_data['payment_id'] = created_payment['id']
                    
                    # Verify tenant rent status changed to Paid
                    tenant_response = self.make_request('GET', 'tenants')
                    if tenant_response and tenant_response.status_code == 200:
                        tenants = tenant_response.json()
                        target_tenant = next((t for t in tenants if t['id'] == self.test_data['tenant_id']), None)
                        if target_tenant and target_tenant.get('rentStatus') == 'Paid':
                            self.log_result('payments', 'Tenant rent status update on payment', True, "Tenant rent status changed to Paid")
                        else:
                            self.log_result('payments', 'Tenant rent status update on payment', False, f"Tenant rent status is {target_tenant.get('rentStatus') if target_tenant else 'not found'}")
                else:
                    self.log_result('payments', 'POST create payment', False, "Missing ID or incorrect data in response")
            else:
                self.log_result('payments', 'POST create payment', False, f"Status: {response.status_code if response else 'No response'}")
    
    def test_expenses_api(self):
        """Test Expenses API"""
        print("\n=== Testing Expenses API ===")
        
        # Test GET expenses (initially empty)
        response = self.make_request('GET', 'expenses')
        if response and response.status_code == 200:
            expenses = response.json()
            self.log_result('expenses', 'GET expenses', True, f"Retrieved {len(expenses)} expenses")
        else:
            self.log_result('expenses', 'GET expenses', False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test POST create expense
        if 'property_id' in self.test_data:
            expense_data = {
                'propertyId': self.test_data['property_id'],
                'propertyName': self.test_data['property_name'],
                'description': 'HVAC Maintenance',
                'amount': 250.00,
                'date': datetime.now().strftime('%Y-%m-%d'),
                'category': 'Maintenance'
            }
            response = self.make_request('POST', 'expenses', expense_data)
            if response and response.status_code == 201:
                created_expense = response.json()
                if created_expense.get('id') and created_expense.get('description') == 'HVAC Maintenance':
                    self.log_result('expenses', 'POST create expense', True, f"Created expense with ID: {created_expense['id']}")
                    self.test_data['expense_id'] = created_expense['id']
                else:
                    self.log_result('expenses', 'POST create expense', False, "Missing ID or incorrect data in response")
            else:
                self.log_result('expenses', 'POST create expense', False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test DELETE expense
        if 'expense_id' in self.test_data:
            response = self.make_request('DELETE', f'expenses/{self.test_data["expense_id"]}')
            if response and response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    self.log_result('expenses', 'DELETE expense', True, "Expense deleted successfully")
                else:
                    self.log_result('expenses', 'DELETE expense', False, "Delete operation did not return success")
            else:
                self.log_result('expenses', 'DELETE expense', False, f"Status: {response.status_code if response else 'No response'}")
    
    def test_cleanup_and_verify_cascade(self):
        """Test cleanup operations and verify cascade effects"""
        print("\n=== Testing Cleanup and Cascade Effects ===")
        
        # Test DELETE tenant (should update property status to Vacant)
        if 'tenant_id' in self.test_data:
            response = self.make_request('DELETE', f'tenants/{self.test_data["tenant_id"]}')
            if response and response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    self.log_result('tenants', 'DELETE tenant', True, "Tenant deleted successfully")
                    
                    # Verify property status changed back to Vacant
                    prop_response = self.make_request('GET', 'properties')
                    if prop_response and prop_response.status_code == 200:
                        properties = prop_response.json()
                        target_property = next((p for p in properties if p['id'] == self.test_data['property_id']), None)
                        if target_property and target_property.get('status') == 'Vacant':
                            self.log_result('tenants', 'Property status update on tenant deletion', True, "Property status changed back to Vacant")
                        else:
                            self.log_result('tenants', 'Property status update on tenant deletion', False, f"Property status is {target_property.get('status') if target_property else 'not found'}")
                else:
                    self.log_result('tenants', 'DELETE tenant', False, "Delete operation did not return success")
            else:
                self.log_result('tenants', 'DELETE tenant', False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test DELETE property
        if 'property_id' in self.test_data:
            response = self.make_request('DELETE', f'properties/{self.test_data["property_id"]}')
            if response and response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    self.log_result('properties', 'DELETE property', True, "Property deleted successfully")
                else:
                    self.log_result('properties', 'DELETE property', False, "Delete operation did not return success")
            else:
                self.log_result('properties', 'DELETE property', False, f"Status: {response.status_code if response else 'No response'}")
    
    def run_all_tests(self):
        """Run all tests in the specified order"""
        print(f"Starting MyRentManager Backend API Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        try:
            # Test flow as specified in requirements
            self.test_settings_api()
            self.test_properties_api()
            self.test_tenants_api()
            self.test_payments_api()
            self.test_expenses_api()
            self.test_cleanup_and_verify_cascade()
            
        except Exception as e:
            print(f"\n❌ CRITICAL ERROR during testing: {str(e)}")
            return False
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        total_passed = 0
        total_failed = 0
        
        for api, results in self.results.items():
            passed = results['passed']
            failed = results['failed']
            total_passed += passed
            total_failed += failed
            
            status = "✅ PASS" if failed == 0 else "❌ FAIL"
            print(f"{api.upper():12} | {status} | Passed: {passed:2d} | Failed: {failed:2d}")
            
            if results['errors']:
                for error in results['errors']:
                    print(f"             └─ {error}")
        
        print("-" * 60)
        print(f"TOTAL        | {'✅ PASS' if total_failed == 0 else '❌ FAIL'} | Passed: {total_passed:2d} | Failed: {total_failed:2d}")
        
        if total_failed == 0:
            print("\n🎉 All backend APIs are working correctly!")
        else:
            print(f"\n⚠️  {total_failed} test(s) failed. Please check the errors above.")
        
        return total_failed == 0

def main():
    """Main test execution"""
    tester = MyRentManagerTester()
    
    success = tester.run_all_tests()
    all_passed = tester.print_summary()
    
    if not success:
        print("\n❌ Testing was interrupted due to critical errors.")
        sys.exit(1)
    elif not all_passed:
        print("\n❌ Some tests failed.")
        sys.exit(1)
    else:
        print("\n✅ All tests passed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    main()
