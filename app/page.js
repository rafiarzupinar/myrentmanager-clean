'use client';

import { useState, useEffect } from 'react';
import { Home, Building2, Users, BarChart3, Settings, Plus, Edit, Trash2, Eye, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settings, setSettings] = useState({ currency: '₺', notifications: true });
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [propertyDialog, setPropertyDialog] = useState(false);
  const [tenantDialog, setTenantDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [editingTenant, setEditingTenant] = useState(null);

  // Form states
  const [propertyForm, setPropertyForm] = useState({ name: '', address: '', type: 'Apartment', monthlyRent: '', status: 'Vacant' });
  const [tenantForm, setTenantForm] = useState({ name: '', email: '', phone: '', propertyId: '', monthlyRent: '', leaseStart: '', leaseEnd: '', rentStatus: 'Pending' });
  const [paymentForm, setPaymentForm] = useState({ tenantId: '', amount: '', date: '' });
  const [expenseForm, setExpenseForm] = useState({ propertyId: '', description: '', amount: '', date: '', category: 'Maintenance' });

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [propsRes, tenantsRes, paymentsRes, expensesRes, settingsRes] = await Promise.all([
        fetch('/api/properties'),
        fetch('/api/tenants'),
        fetch('/api/payments'),
        fetch('/api/expenses'),
        fetch('/api/settings'),
      ]);

      setProperties(await propsRes.json());
      setTenants(await tenantsRes.json());
      setPayments(await paymentsRes.json());
      setExpenses(await expensesRes.json());
      const settingsData = await settingsRes.json();
      setSettings(settingsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalProperties = Array.isArray(properties) ? properties.length : 0;
  const totalTenants = Array.isArray(tenants) ? tenants.length : 0;
  const occupiedProperties = Array.isArray(properties) ? properties.filter(p => p.status === 'Occupied').length : 0;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyIncome = Array.isArray(tenants) ? tenants
    .filter(t => t.rentStatus === 'Paid')
    .reduce((sum, t) => sum + (t.monthlyRent || 0), 0) : 0;

  const rentDue = Array.isArray(tenants) ? tenants
    .filter(t => t.rentStatus === 'Pending')
    .reduce((sum, t) => sum + (t.monthlyRent || 0), 0) : 0;

  const monthlyExpenses = Array.isArray(expenses) ? expenses
    .filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    })
    .reduce((sum, e) => sum + (e.amount || 0), 0) : 0;

  const netIncome = monthlyIncome - monthlyExpenses;

  // Property CRUD
  const handleCreateProperty = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propertyForm),
      });
      const newProperty = await res.json();
      setProperties([newProperty, ...properties]);
      setPropertyForm({ name: '', address: '', type: 'Apartment', monthlyRent: '', status: 'Vacant' });
      setPropertyDialog(false);
    } catch (error) {
      console.error('Error creating property:', error);
    }
  };

  const handleUpdateProperty = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/properties/${editingProperty.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propertyForm),
      });
      const updated = await res.json();
      setProperties(properties.map(p => p.id === updated.id ? updated : p));
      setEditingProperty(null);
      setPropertyForm({ name: '', address: '', type: 'Apartment', monthlyRent: '', status: 'Vacant' });
      setPropertyDialog(false);
    } catch (error) {
      console.error('Error updating property:', error);
    }
  };

  const handleDeleteProperty = async (id) => {
    if (!confirm('Bu gayrimenkulü silmek istediğinizden emin misiniz?')) return;
    try {
      await fetch(`/api/properties/${id}`, { method: 'DELETE' });
      setProperties(properties.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting property:', error);
    }
  };

  // Tenant CRUD
  const handleCreateTenant = async (e) => {
    e.preventDefault();
    try {
      const property = properties.find(p => p.id === tenantForm.propertyId);
      const tenantData = {
        ...tenantForm,
        propertyName: property?.name || '',
      };

      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantData),
      });
      const newTenant = await res.json();
      setTenants([newTenant, ...tenants]);

      // Update property status
      if (property) {
        setProperties(properties.map(p =>
          p.id === property.id ? { ...p, status: 'Occupied' } : p
        ));
      }

      setTenantForm({ name: '', email: '', phone: '', propertyId: '', monthlyRent: '', leaseStart: '', leaseEnd: '', rentStatus: 'Pending' });
      setTenantDialog(false);
    } catch (error) {
      console.error('Error creating tenant:', error);
    }
  };

  const handleUpdateTenant = async (e) => {
    e.preventDefault();
    try {
      const property = properties.find(p => p.id === tenantForm.propertyId);
      const tenantData = {
        ...tenantForm,
        propertyName: property?.name || '',
      };

      const res = await fetch(`/api/tenants/${editingTenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantData),
      });
      const updated = await res.json();
      setTenants(tenants.map(t => t.id === updated.id ? updated : t));
      setEditingTenant(null);
      setTenantForm({ name: '', email: '', phone: '', propertyId: '', monthlyRent: '', leaseStart: '', leaseEnd: '', rentStatus: 'Pending' });
      setTenantDialog(false);
    } catch (error) {
      console.error('Error updating tenant:', error);
    }
  };

  const handleDeleteTenant = async (id) => {
    if (!confirm('Are you sure you want to delete this tenant?')) return;
    try {
      const tenant = tenants.find(t => t.id === id);
      await fetch(`/api/tenants/${id}`, { method: 'DELETE' });
      setTenants(tenants.filter(t => t.id !== id));

      // Update property status
      if (tenant?.propertyId) {
        setProperties(properties.map(p =>
          p.id === tenant.propertyId ? { ...p, status: 'Vacant' } : p
        ));
      }
    } catch (error) {
      console.error('Error deleting tenant:', error);
    }
  };

  // Payment
  const handleCreatePayment = async (e) => {
    e.preventDefault();
    try {
      const tenant = tenants.find(t => t.id === paymentForm.tenantId);
      const property = properties.find(p => p.id === tenant?.propertyId);

      const paymentData = {
        ...paymentForm,
        tenantName: tenant?.name || '',
        propertyId: tenant?.propertyId || '',
        propertyName: property?.name || '',
      };

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      });
      const newPayment = await res.json();
      setPayments([newPayment, ...payments]);

      // Update tenant rent status
      setTenants(tenants.map(t =>
        t.id === paymentForm.tenantId ? { ...t, rentStatus: 'Paid' } : t
      ));

      setPaymentForm({ tenantId: '', amount: '', date: '' });
      setPaymentDialog(false);
    } catch (error) {
      console.error('Error creating payment:', error);
    }
  };

  // Expense
  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      const property = properties.find(p => p.id === expenseForm.propertyId);
      const expenseData = {
        ...expenseForm,
        propertyName: property?.name || 'General',
      };

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
      });
      const newExpense = await res.json();
      setExpenses([newExpense, ...expenses]);
      setExpenseForm({ propertyId: '', description: '', amount: '', date: '', category: 'Maintenance' });
      setExpenseDialog(false);
    } catch (error) {
      console.error('Error creating expense:', error);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      setExpenses(expenses.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  // Settings
  const handleUpdateSettings = async (newSettings) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      const updated = await res.json();
      setSettings(updated);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  // Chart data
  const getMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();

    return months.map((month, index) => {
      const monthPayments = payments.filter(p => {
        const paymentDate = new Date(p.date);
        return paymentDate.getMonth() === index && paymentDate.getFullYear() === currentYear;
      });

      const monthExpenses = expenses.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate.getMonth() === index && expenseDate.getFullYear() === currentYear;
      });

      const income = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const expense = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      return {
        month,
        income,
        expenses: expense,
      };
    });
  };

  const openEditProperty = (property) => {
    setEditingProperty(property);
    setPropertyForm({
      name: property.name,
      address: property.address,
      type: property.type,
      monthlyRent: property.monthlyRent.toString(),
      status: property.status,
    });
    setPropertyDialog(true);
  };

  const openEditTenant = (tenant) => {
    setEditingTenant(tenant);
    setTenantForm({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      propertyId: tenant.propertyId,
      monthlyRent: tenant.monthlyRent.toString(),
      leaseStart: tenant.leaseStart,
      leaseEnd: tenant.leaseEnd,
      rentStatus: tenant.rentStatus,
    });
    setTenantDialog(true);
  };

  const checkLeaseExpiry = (leaseEnd) => {
    const today = new Date();
    const endDate = new Date(leaseEnd);
    const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return { status: 'expired', days: Math.abs(daysUntilExpiry) };
    if (daysUntilExpiry <= 30) return { status: 'expiring', days: daysUntilExpiry };
    return { status: 'active', days: daysUntilExpiry };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-20">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Kira Yöneticim</h1>
          <p className="text-blue-100 mt-1">Gayrimenkullerinizi kolayca yönetin</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Dashboard */}
        {currentPage === 'dashboard' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">İyi günler, gayrimenkul özetiniz</h2>
              <p className="text-gray-600">Kira gelir ve giderlerinizi takip edin</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card className="bg-white border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Toplam Gayrimenkul</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{totalProperties}</div>
                  <p className="text-xs text-gray-500 mt-1">{occupiedProperties} dolu</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Toplam Kiracı</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{totalTenants}</div>
                  <p className="text-xs text-gray-500 mt-1">Aktif kiracı</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-l-4 border-l-orange-500 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Bekleyen Kira</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">{settings.currency}{rentDue.toFixed(2)}</div>
                  <p className="text-xs text-gray-500 mt-1">Bu ay</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Aylık Gelir</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">{settings.currency}{monthlyIncome.toFixed(2)}</div>
                  <p className="text-xs text-gray-500 mt-1">Tahsil edildi</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-l-4 border-l-red-500 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Aylık Gider</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">{settings.currency}{monthlyExpenses.toFixed(2)}</div>
                  <p className="text-xs text-gray-500 mt-1">Bu ay</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle>Hızlı İşlemler</CardTitle>
                <CardDescription>Gayrimenkul ve kiracılarınızı yönetin</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button onClick={() => setPropertyDialog(true)} className="h-24 flex-col gap-2 bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-6 w-6" />
                   Gayrimenkul Ekle
                  </Button>
                  <Button onClick={() => setTenantDialog(true)} className="h-24 flex-col gap-2 bg-green-600 hover:bg-green-700">
                    <Plus className="h-6 w-6" />
                    Yeni Kiracı Ekle
                  </Button>
                  <Button onClick={() => setExpenseDialog(true)} className="h-24 flex-col gap-2 bg-red-600 hover:bg-red-700">
                    <Plus className="h-6 w-6" />
                    Gider Ekle
                  </Button>
                  <Button onClick={() => setPaymentDialog(true)} className="h-24 flex-col gap-2 bg-purple-600 hover:bg-purple-700">
                    <Plus className="h-6 w-6" />
                    Ödeme Ekle
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Properties Page */}
        {currentPage === 'properties' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Gayrimenkullerim</h2>
                <p className="text-gray-600">Kiralık gayrimenkullerinizi yönetin</p>
              </div>
              <Button onClick={() => { setEditingProperty(null); setPropertyForm({ name: '', address: '', type: 'Apartment', monthlyRent: '', status: 'Vacant' }); setPropertyDialog(true); }} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Gayrimenkul Ekle
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map(property => (
                <Card key={property.id} className="bg-white shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{property.name}</CardTitle>
                        <CardDescription className="mt-1">{property.address}</CardDescription>
                      </div>
                      <Badge variant={property.status === 'Occupied' ? 'default' : 'secondary'} className={property.status === 'Occupied' ? 'bg-green-500' : 'bg-gray-500'}>
                        {property.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tip:</span>
                        <span className="font-medium">{property.type}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Aylık Kira:</span>
                        <span className="font-bold text-blue-600">{settings.currency}{property.monthlyRent}</span>
                      </div>
                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Button onClick={() => openEditProperty(property)} size="sm" variant="outline" className="flex-1">
                          <Edit className="h-3 w-3 mr-1" />
                          Düzenle
                        </Button>
                        <Button onClick={() => handleDeleteProperty(property.id)} size="sm" variant="outline" className="flex-1 text-red-600 hover:bg-red-50">
                          <Trash2 className="h-3 w-3 mr-1" />
                          Sil
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {properties.length === 0 && (
              <Card className="bg-white shadow-md">
                <CardContent className="text-center py-12">
                  <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Henüz gayrimenkul yok. Başlamak için ilk gayrimenkulünüzü ekleyin!</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Tenants Page */}
        {currentPage === 'tenants' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Kiracılarım</h2>
                <p className="text-gray-600">Kiracılarınızı ve kira ödemelerini yönetin</p>
              </div>
              <Button onClick={() => { setEditingTenant(null); setTenantForm({ name: '', email: '', phone: '', propertyId: '', monthlyRent: '', leaseStart: '', leaseEnd: '', rentStatus: 'Pending' }); setTenantDialog(true); }} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Kiracı Ekle
              </Button>
            </div>

            <div className="space-y-4">
              {tenants.map(tenant => {
                const leaseStatus = checkLeaseExpiry(tenant.leaseEnd);
                return (
                  <Card key={tenant.id} className="bg-white shadow-md hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-800">{tenant.name}</h3>
                            <Badge variant={tenant.rentStatus === 'Paid' ? 'default' : 'secondary'} className={tenant.rentStatus === 'Paid' ? 'bg-green-500' : 'bg-orange-500'}>
                              {tenant.rentStatus}
                            </Badge>
                            {leaseStatus.status === 'expiring' && (
                              <Badge variant="secondary" className="bg-yellow-500 text-white">
                                {leaseStatus.days} gün içinde bitiyor
                              </Badge>
                            )}
                            {leaseStatus.status === 'expired' && (
                              <Badge variant="secondary" className="bg-red-500 text-white">
                                {leaseStatus.days} gün önce bitti
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">Gayrimenkul:</span>
                              <p className="font-medium">{tenant.propertyName || 'Yok'}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">E-posta:</span>
                              <p className="font-medium">{tenant.email}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Telefon:</span>
                              <p className="font-medium">{tenant.phone}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Aylık Kira:</span>
                              <p className="font-bold text-blue-600">{settings.currency}{tenant.monthlyRent}</p>
                            </div>
                          </div>
                          <div className="flex gap-4 mt-2 text-sm text-gray-600">
                            <span>Kira Sözleşmesi: {new Date(tenant.leaseStart).toLocaleDateString('tr-TR')} - {new Date(tenant.leaseEnd).toLocaleDateString('tr-TR')}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => openEditTenant(tenant)} size="sm" variant="outline">
                            <Edit className="h-3 w-3 mr-1" />
                            Düzenle
                          </Button>
                          <Button onClick={() => handleDeleteTenant(tenant.id)} size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                            <Trash2 className="h-3 w-3 mr-1" />
                            Sil
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {tenants.length === 0 && (
              <Card className="bg-white shadow-md">
                <CardContent className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Henüz kiracı yok. Başlamak için ilk kiracınızı ekleyin!</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Reports Page */}
        {currentPage === 'reports' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Mali Raporlar</h2>
              <p className="text-gray-600">Gelir ve giderlerinizi takip edin</p>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-white">Aylık Gelir</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{settings.currency}{monthlyIncome.toFixed(2)}</div>
                  <p className="text-green-100 mt-2">{tenants.filter(t => t.rentStatus === 'Paid').length} ödeme yapan kiracı</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-white">Aylık Gider</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{settings.currency}{monthlyExpenses.toFixed(2)}</div>
                  <p className="text-red-100 mt-2">{expenses.filter(e => {
                    const expenseDate = new Date(e.date);
                    return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
                  }).length} gider</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-white">Net Gelir</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{settings.currency}{netIncome.toFixed(2)}</div>
                  <p className="text-blue-100 mt-2">Bu ay {netIncome >= 0 ? 'Kar' : 'Zarar'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle>Gelir ve Gider Karşılaştırması ({currentYear})</CardTitle>
                <CardDescription>Aylık kira geliri ve gider karşılaştırması</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getMonthlyData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="income" fill="#10b981" name="Gelir" />
                    <Bar dataKey="expenses" fill="#ef4444" name="Gider" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle>Önemli Metrikler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">{occupiedProperties}</div>
                    <p className="text-gray-600 mt-1">Dolu Gayrimenkul</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-3xl font-bold text-orange-600">{tenants.filter(t => t.rentStatus === 'Pending').length}</div>
                    <p className="text-gray-600 mt-1">Bekleyen Ödemeler</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-3xl font-bold text-red-600">{tenants.filter(t => {
                      const leaseStatus = checkLeaseExpiry(t.leaseEnd);
                      return leaseStatus.status === 'expired';
                    }).length}</div>
                    <p className="text-gray-600 mt-1">Süresi Dolmuş Sözleşmeler</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Expenses */}
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle>Son Giderler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {expenses.slice(0, 5).map(expense => (
                    <div key={expense.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        <p className="text-sm text-gray-600">{expense.propertyName} • {new Date(expense.date).toLocaleDateString('tr-TR')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-600">{settings.currency}{expense.amount}</span>
                        <Button onClick={() => handleDeleteExpense(expense.id)} size="sm" variant="ghost" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {expenses.length === 0 && (
                    <p className="text-center text-gray-500 py-8">Henüz gider kaydedilmedi</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Settings Page */}
        {currentPage === 'settings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Ayarlar</h2>
              <p className="text-gray-600">Uygulama tercihlerinizi yönetin</p>
            </div>

            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle>Para Birimi</CardTitle>
                <CardDescription>Tercih ettiğiniz para birimi sembolünü seçin</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={settings.currency} onValueChange={(value) => handleUpdateSettings({ ...settings, currency: value })}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="₺">₺ (Türk Lirası)</SelectItem>
                    <SelectItem value="$">$ (Dolar)</SelectItem>
                    <SelectItem value="€">€ (Euro)</SelectItem>
                    <SelectItem value="£">£ (Sterlin)</SelectItem>
                    <SelectItem value="¥">¥ (Yen)</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle>Hakkında</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Uygulama Adı:</strong> Kira Yöneticim</p>
                  <p><strong>Versiyon:</strong> 1.0.0</p>
                  <p><strong>Açıklama:</strong> Kişisel gayrimenkul ve kira takip uygulaması</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-around items-center h-16">
            <button onClick={() => setCurrentPage('dashboard')} className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${currentPage === 'dashboard' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>
              <Home className="h-6 w-6" />
              <span className="text-xs mt-1">Ana Sayfa</span>
            </button>
            <button onClick={() => setCurrentPage('properties')} className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${currentPage === 'properties' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>
              <Building2 className="h-6 w-6" />
              <span className="text-xs mt-1">Gayrimenkuller</span>
            </button>
            <button onClick={() => setCurrentPage('tenants')} className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${currentPage === 'tenants' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>
              <Users className="h-6 w-6" />
              <span className="text-xs mt-1">Kiracılar</span>
            </button>
            <button onClick={() => setCurrentPage('reports')} className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${currentPage === 'reports' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>
              <BarChart3 className="h-6 w-6" />
              <span className="text-xs mt-1">Raporlar</span>
            </button>
            <button onClick={() => setCurrentPage('settings')} className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${currentPage === 'settings' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>
              <Settings className="h-6 w-6" />
              <span className="text-xs mt-1">Ayarlar</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Property Dialog */}
      <Dialog open={propertyDialog} onOpenChange={setPropertyDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingProperty ? 'Gayrimenkul Düzenle' : 'Yeni Gayrimenkul Ekle'}</DialogTitle>
            <DialogDescription>Gayrimenkul bilgilerini aşağıya girin</DialogDescription>
          </DialogHeader>
          <form onSubmit={editingProperty ? handleUpdateProperty : handleCreateProperty} className="space-y-4">
            <div>
              <Label htmlFor="name">Gayrimenkul Adı</Label>
              <Input id="name" value={propertyForm.name} onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })} placeholder="Örn: Gün Batımı Apartmanı 4B" required />
            </div>
            <div>
              <Label htmlFor="address">Adres</Label>
              <Input id="address" value={propertyForm.address} onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })} placeholder="Örn: Atatürk Cad. No:123, İstanbul" required />
            </div>
            <div>
              <Label htmlFor="type">Gayrimenkul Tipi</Label>
              <Select value={propertyForm.type} onValueChange={(value) => setPropertyForm({ ...propertyForm, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Apartment">Daire</SelectItem>
                  <SelectItem value="House">Ev</SelectItem>
                  <SelectItem value="Commercial">İşyeri</SelectItem>
                  <SelectItem value="Studio">Stüdyo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="monthlyRent">Aylık Kira</Label>
              <Input id="monthlyRent" type="number" step="0.01" value={propertyForm.monthlyRent} onChange={(e) => setPropertyForm({ ...propertyForm, monthlyRent: e.target.value })} placeholder="Örn: 15000" required />
            </div>
            <div>
              <Label htmlFor="status">Durum</Label>
              <Select value={propertyForm.status} onValueChange={(value) => setPropertyForm({ ...propertyForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vacant">Boş</SelectItem>
                  <SelectItem value="Occupied">Dolu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                {editingProperty ? 'Güncelle' : 'Oluştur'}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setPropertyDialog(false); setEditingProperty(null); }} className="flex-1">
                İptal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tenant Dialog */}
      <Dialog open={tenantDialog} onOpenChange={setTenantDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTenant ? 'Kiracı Düzenle' : 'Yeni Kiracı Ekle'}</DialogTitle>
            <DialogDescription>Kiracı bilgilerini aşağıya girin</DialogDescription>
          </DialogHeader>
          <form onSubmit={editingTenant ? handleUpdateTenant : handleCreateTenant} className="space-y-4">
            <div>
              <Label htmlFor="tenant-name">Kiracı Adı</Label>
              <Input id="tenant-name" value={tenantForm.name} onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })} placeholder="Örn: Ahmet Yılmaz" required />
            </div>
            <div>
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" type="email" value={tenantForm.email} onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })} placeholder="Örn: ahmet@ornek.com" required />
            </div>
            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" value={tenantForm.phone} onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })} placeholder="Örn: +90 555 123 4567" required />
            </div>
            <div>
              <Label htmlFor="property">Gayrimenkul</Label>
              <Select value={tenantForm.propertyId} onValueChange={(value) => {
                const property = properties.find(p => p.id === value);
                setTenantForm({ ...tenantForm, propertyId: value, monthlyRent: property?.monthlyRent?.toString() || '' });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Bir gayrimenkul seçin" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(property => (
                    <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tenant-rent">Aylık Kira</Label>
              <Input id="tenant-rent" type="number" step="0.01" value={tenantForm.monthlyRent} onChange={(e) => setTenantForm({ ...tenantForm, monthlyRent: e.target.value })} placeholder="Örn: 15000" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="leaseStart">Sözleşme Başlangıcı</Label>
                <Input id="leaseStart" type="date" value={tenantForm.leaseStart} onChange={(e) => setTenantForm({ ...tenantForm, leaseStart: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="leaseEnd">Sözleşme Bitişi</Label>
                <Input id="leaseEnd" type="date" value={tenantForm.leaseEnd} onChange={(e) => setTenantForm({ ...tenantForm, leaseEnd: e.target.value })} required />
              </div>
            </div>
            <div>
              <Label htmlFor="rentStatus">Kira Durumu</Label>
              <Select value={tenantForm.rentStatus} onValueChange={(value) => setTenantForm({ ...tenantForm, rentStatus: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Bekliyor</SelectItem>
                  <SelectItem value="Paid">Ödendi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                {editingTenant ? 'Güncelle' : 'Oluştur'}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setTenantDialog(false); setEditingTenant(null); }} className="flex-1">
                İptal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Ödeme Kaydet</DialogTitle>
            <DialogDescription>Kiracıdan alınan kira ödemesini kaydedin</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePayment} className="space-y-4">
            <div>
              <Label htmlFor="payment-tenant">Kiracı</Label>
              <Select value={paymentForm.tenantId} onValueChange={(value) => {
                const tenant = tenants.find(t => t.id === value);
                setPaymentForm({ ...paymentForm, tenantId: value, amount: tenant?.monthlyRent?.toString() || '' });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Bir kiracı seçin" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map(tenant => (
                    <SelectItem key={tenant.id} value={tenant.id}>{tenant.name} - {tenant.propertyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payment-amount">Tutar</Label>
              <Input id="payment-amount" type="number" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="Örn: 15000" required />
            </div>
            <div>
              <Label htmlFor="payment-date">Ödeme Tarihi</Label>
              <Input id="payment-date" type="date" value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} required />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
                Ödemeyi Kaydet
              </Button>
              <Button type="button" variant="outline" onClick={() => setPaymentDialog(false)} className="flex-1">
                İptal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Gider Ekle</DialogTitle>
            <DialogDescription>Gayrimenkul ile ilgili bir gider kaydedin</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateExpense} className="space-y-4">
            <div>
              <Label htmlFor="expense-property">Gayrimenkul (İsteğe Bağlı)</Label>
              <Select value={expenseForm.propertyId} onValueChange={(value) => setExpenseForm({ ...expenseForm, propertyId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Bir gayrimenkul seçin (isteğe bağlı)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Genel Gider</SelectItem>
                  {properties.map(property => (
                    <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="expense-description">Açıklama</Label>
              <Input id="expense-description" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="Örn: Tesisat onarımı" required />
            </div>
            <div>
              <Label htmlFor="expense-amount">Tutar</Label>
              <Input id="expense-amount" type="number" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="Örn: 2500" required />
            </div>
            <div>
              <Label htmlFor="expense-date">Tarih</Label>
              <Input id="expense-date" type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="expense-category">Kategori</Label>
              <Select value={expenseForm.category} onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Maintenance">Bakım</SelectItem>
                  <SelectItem value="Repair">Onarım</SelectItem>
                  <SelectItem value="Utilities">Faturalar</SelectItem>
                  <SelectItem value="Insurance">Sigorta</SelectItem>
                  <SelectItem value="Tax">Vergi</SelectItem>
                  <SelectItem value="Other">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">
                Gider Ekle
              </Button>
              <Button type="button" variant="outline" onClick={() => setExpenseDialog(false)} className="flex-1">
                İptal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
