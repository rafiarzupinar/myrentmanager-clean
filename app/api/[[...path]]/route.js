import { MongoClient, ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

let client;
let db;

async function connectDB() {
  if (db) return db;
  
  try {
    client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    db = client.db('myrentmanager');
    console.log('Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Helper to get collections
async function getCollection(name) {
  const database = await connectDB();
  return database.collection(name);
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// ==================== PROPERTIES ROUTES ====================

async function getProperties() {
  const collection = await getCollection('properties');
  const properties = await collection.find({}).sort({ createdAt: -1 }).toArray();
  return NextResponse.json(properties, { headers: corsHeaders });
}

async function createProperty(request) {
  const body = await request.json();
  const collection = await getCollection('properties');
  
  const property = {
    id: uuidv4(),
    name: body.name,
    address: body.address,
    type: body.type,
    monthlyRent: parseFloat(body.monthlyRent),
    status: body.status || 'Vacant',
    createdAt: new Date().toISOString(),
  };
  
  await collection.insertOne(property);
  return NextResponse.json(property, { status: 201, headers: corsHeaders });
}

async function updateProperty(request, id) {
  const body = await request.json();
  const collection = await getCollection('properties');
  
  const updateData = {
    name: body.name,
    address: body.address,
    type: body.type,
    monthlyRent: parseFloat(body.monthlyRent),
    status: body.status,
    updatedAt: new Date().toISOString(),
  };
  
  await collection.updateOne({ id }, { $set: updateData });
  const updated = await collection.findOne({ id });
  return NextResponse.json(updated, { headers: corsHeaders });
}

async function deleteProperty(id) {
  const collection = await getCollection('properties');
  await collection.deleteOne({ id });
  return NextResponse.json({ success: true }, { headers: corsHeaders });
}

// ==================== TENANTS ROUTES ====================

async function getTenants() {
  const collection = await getCollection('tenants');
  const tenants = await collection.find({}).sort({ createdAt: -1 }).toArray();
  return NextResponse.json(tenants, { headers: corsHeaders });
}

async function createTenant(request) {
  const body = await request.json();
  const collection = await getCollection('tenants');
  
  const tenant = {
    id: uuidv4(),
    name: body.name,
    email: body.email,
    phone: body.phone,
    propertyId: body.propertyId,
    propertyName: body.propertyName,
    monthlyRent: parseFloat(body.monthlyRent),
    leaseStart: body.leaseStart,
    leaseEnd: body.leaseEnd,
    rentStatus: body.rentStatus || 'Pending',
    createdAt: new Date().toISOString(),
  };
  
  await collection.insertOne(tenant);
  
  // Update property status to Occupied
  if (body.propertyId) {
    const propCollection = await getCollection('properties');
    await propCollection.updateOne(
      { id: body.propertyId },
      { $set: { status: 'Occupied' } }
    );
  }
  
  return NextResponse.json(tenant, { status: 201, headers: corsHeaders });
}

async function updateTenant(request, id) {
  const body = await request.json();
  const collection = await getCollection('tenants');
  
  const updateData = {
    name: body.name,
    email: body.email,
    phone: body.phone,
    propertyId: body.propertyId,
    propertyName: body.propertyName,
    monthlyRent: parseFloat(body.monthlyRent),
    leaseStart: body.leaseStart,
    leaseEnd: body.leaseEnd,
    rentStatus: body.rentStatus,
    updatedAt: new Date().toISOString(),
  };
  
  await collection.updateOne({ id }, { $set: updateData });
  const updated = await collection.findOne({ id });
  return NextResponse.json(updated, { headers: corsHeaders });
}

async function deleteTenant(id) {
  const collection = await getCollection('tenants');
  const tenant = await collection.findOne({ id });
  
  if (tenant && tenant.propertyId) {
    // Update property status to Vacant
    const propCollection = await getCollection('properties');
    await propCollection.updateOne(
      { id: tenant.propertyId },
      { $set: { status: 'Vacant' } }
    );
  }
  
  await collection.deleteOne({ id });
  return NextResponse.json({ success: true }, { headers: corsHeaders });
}

// ==================== PAYMENTS ROUTES ====================

async function getPayments() {
  const collection = await getCollection('payments');
  const payments = await collection.find({}).sort({ date: -1 }).toArray();
  return NextResponse.json(payments, { headers: corsHeaders });
}

async function createPayment(request) {
  const body = await request.json();
  const collection = await getCollection('payments');
  
  const payment = {
    id: uuidv4(),
    tenantId: body.tenantId,
    tenantName: body.tenantName,
    propertyId: body.propertyId,
    propertyName: body.propertyName,
    amount: parseFloat(body.amount),
    date: body.date,
    status: body.status || 'Paid',
    createdAt: new Date().toISOString(),
  };
  
  await collection.insertOne(payment);
  
  // Update tenant rent status
  if (body.tenantId) {
    const tenantCollection = await getCollection('tenants');
    await tenantCollection.updateOne(
      { id: body.tenantId },
      { $set: { rentStatus: 'Paid' } }
    );
  }
  
  return NextResponse.json(payment, { status: 201, headers: corsHeaders });
}

// ==================== EXPENSES ROUTES ====================

async function getExpenses() {
  const collection = await getCollection('expenses');
  const expenses = await collection.find({}).sort({ date: -1 }).toArray();
  return NextResponse.json(expenses, { headers: corsHeaders });
}

async function createExpense(request) {
  const body = await request.json();
  const collection = await getCollection('expenses');
  
  const expense = {
    id: uuidv4(),
    propertyId: body.propertyId,
    propertyName: body.propertyName,
    description: body.description,
    amount: parseFloat(body.amount),
    date: body.date,
    category: body.category,
    createdAt: new Date().toISOString(),
  };
  
  await collection.insertOne(expense);
  return NextResponse.json(expense, { status: 201, headers: corsHeaders });
}

async function deleteExpense(id) {
  const collection = await getCollection('expenses');
  await collection.deleteOne({ id });
  return NextResponse.json({ success: true }, { headers: corsHeaders });
}

// ==================== SETTINGS ROUTES ====================

async function getSettings() {
  const collection = await getCollection('settings');
  let settings = await collection.findOne({ type: 'app_settings' });
  
  if (!settings) {
    settings = {
      id: uuidv4(),
      type: 'app_settings',
      currency: '₺',
      notifications: true,
      createdAt: new Date().toISOString(),
    };
    await collection.insertOne(settings);
  }
  
  return NextResponse.json(settings, { headers: corsHeaders });
}

async function updateSettings(request) {
  const body = await request.json();
  const collection = await getCollection('settings');
  
  await collection.updateOne(
    { type: 'app_settings' },
    { $set: { currency: body.currency, notifications: body.notifications } },
    { upsert: true }
  );
  
  const updated = await collection.findOne({ type: 'app_settings' });
  return NextResponse.json(updated, { headers: corsHeaders });
}

// ==================== MAIN ROUTER ====================

export async function GET(request, { params }) {
  try {
    const path = params.path ? params.path.join('/') : '';
    
    if (path === 'properties') return await getProperties();
    if (path === 'tenants') return await getTenants();
    if (path === 'payments') return await getPayments();
    if (path === 'expenses') return await getExpenses();
    if (path === 'settings') return await getSettings();
    
    return NextResponse.json({ message: 'API is running' }, { headers: corsHeaders });
  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const path = params.path ? params.path.join('/') : '';
    
    if (path === 'properties') return await createProperty(request);
    if (path === 'tenants') return await createTenant(request);
    if (path === 'payments') return await createPayment(request);
    if (path === 'expenses') return await createExpense(request);
    
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404, headers: corsHeaders }
    );
  } catch (error) {
    console.error('POST Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const path = params.path ? params.path.join('/') : '';
    const pathParts = path.split('/');
    
    if (pathParts[0] === 'properties' && pathParts[1]) {
      return await updateProperty(request, pathParts[1]);
    }
    if (pathParts[0] === 'tenants' && pathParts[1]) {
      return await updateTenant(request, pathParts[1]);
    }
    if (path === 'settings') {
      return await updateSettings(request);
    }
    
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404, headers: corsHeaders }
    );
  } catch (error) {
    console.error('PUT Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const path = params.path ? params.path.join('/') : '';
    const pathParts = path.split('/');
    
    if (pathParts[0] === 'properties' && pathParts[1]) {
      return await deleteProperty(pathParts[1]);
    }
    if (pathParts[0] === 'tenants' && pathParts[1]) {
      return await deleteTenant(pathParts[1]);
    }
    if (pathParts[0] === 'expenses' && pathParts[1]) {
      return await deleteExpense(pathParts[1]);
    }
    
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404, headers: corsHeaders }
    );
  } catch (error) {
    console.error('DELETE Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}