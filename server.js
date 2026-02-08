const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4: uuid } = require('uuid')
const nodemailer = require('nodemailer')
const PDFDocument = require('pdfkit')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me'
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')
const OWNER_EMAIL = process.env.OWNER_EMAIL || ''
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

const emailTransport =
  SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      })
    : null

const notifyOwner = async ({ subject, text }) => {
  if (!emailTransport || !OWNER_EMAIL) {
    return
  }
  try {
    await emailTransport.sendMail({
      from: SMTP_USER,
      to: OWNER_EMAIL,
      subject,
      text
    })
  } catch (err) {
    console.error('Failed to send login email:', err.message)
  }
}

const notifyOwnerLogin = ({ email, ip }) =>
  notifyOwner({
    subject: 'BikeGuard login alert',
    text: `User ${email} logged in at ${new Date().toISOString()} from IP ${ip || 'unknown'}.`
  })

const notifyOwnerSos = ({ email, location }) =>
  notifyOwner({
    subject: 'BikeGuard SOS alert',
    text: `User ${email} triggered SOS at ${new Date().toISOString()} with location: ${
      location || 'unknown'
    }.`
  })

const notifyOwnerIssue = ({ email, title, status }) =>
  notifyOwner({
    subject: 'BikeGuard issue update',
    text: `User ${email} reported issue "${title}" at ${new Date().toISOString()} (status: ${
      status || 'In review'
    }).`
  })

app.use(cors())
app.use(express.json())

const readDb = () => {
  if (!fs.existsSync(DB_FILE)) {
    return { users: [], rides: [], issues: [], sosEvents: [] }
  }
  const raw = fs.readFileSync(DB_FILE, 'utf8')
  const parsed = JSON.parse(raw || '{}')
  return {
    users: parsed.users || [],
    rides: parsed.rides || [],
    issues: parsed.issues || [],
    sosEvents: parsed.sosEvents || []
  }
}

const writeDb = (db) => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

const seedDb = () => {
  const db = readDb()
  if (db.users && db.users.length > 0) {
    return
  }
  const demoPassword = process.env.DEMO_PASSWORD || 'demo1234'
  const demoUserId = uuid()
  const demoUser = {
    id: demoUserId,
    name: 'Rider Nova',
    email: 'demo@bikeguard.app',
    passwordHash: bcrypt.hashSync(demoPassword, 10),
    phone: '',
    medicalInfo: '',
    contacts: [
      { id: uuid(), name: 'Sam Rodriguez', phone: '+1-555-222-9901' },
      { id: uuid(), name: 'Care Team', phone: '+1-555-222-8834' },
      { id: uuid(), name: 'City Safety Desk', phone: '+1-555-211-1010' }
    ],
    role: ADMIN_EMAILS.includes('demo@bikeguard.app') ? 'admin' : 'user',
    activeRide: null,
    createdAt: new Date().toISOString()
  }
  db.users = [demoUser]
  db.rides = [
    {
      id: uuid(),
      userId: demoUserId,
      name: 'Midnight Loop',
      durationMin: 28,
      distanceKm: 14.2,
      type: 'Night',
      safetyScore: 91,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString()
    },
    {
      id: uuid(),
      userId: demoUserId,
      name: 'Coastal Glide',
      durationMin: 41,
      distanceKm: 22.8,
      type: 'Day',
      safetyScore: 95,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString()
    },
    {
      id: uuid(),
      userId: demoUserId,
      name: 'City Loop',
      durationMin: 36,
      distanceKm: 18.7,
      type: 'Day',
      safetyScore: 93,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString()
    }
  ]
  db.issues = [
    {
      id: uuid(),
      userId: demoUserId,
      title: 'Rear brake alignment',
      priority: 'Medium',
      notes: '',
      status: 'In review',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
    },
    {
      id: uuid(),
      userId: demoUserId,
      title: 'Chain lubrication',
      priority: 'Low',
      notes: '',
      status: 'Resolved',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString()
    },
    {
      id: uuid(),
      userId: demoUserId,
      title: 'Front light flicker',
      priority: 'High',
      notes: '',
      status: 'Monitoring',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
    }
  ]
  db.sosEvents = []
  writeDb(db)
}

seedDb()

const sanitizeUser = (user) => {
  const { passwordHash, ...safe } = user
  return safe
}

const auth = (req, res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Missing token' })
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.sub
    return next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

const requireAdmin = (req, res, next) => {
  const db = readDb()
  const user = db.users.find((u) => u.id === req.userId)
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' })
  }
  return next()
}

app.post('/api/auth/signup', (req, res) => {
  const { name, email, password, contacts } = req.body || {}
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, password required' })
  }
  const db = readDb()
  const exists = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (exists) {
    return res.status(409).json({ error: 'Email already exists' })
  }
  const user = {
    id: uuid(),
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    phone: '',
    medicalInfo: '',
    contacts: Array.isArray(contacts) ? contacts : [],
    role: ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user',
    activeRide: null,
    createdAt: new Date().toISOString()
  }
  db.users.push(user)
  writeDb(db)
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' })
  return res.json({ token, user: sanitizeUser(user) })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }
  const db = readDb()
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' })
  notifyOwnerLogin({ email: user.email, ip: req.ip })
  return res.json({ token, user: sanitizeUser(user) })
})

app.get('/api/me', auth, (req, res) => {
  const db = readDb()
  const user = db.users.find((u) => u.id === req.userId)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  return res.json({ user: sanitizeUser(user) })
})

app.get('/api/profile', auth, (req, res) => {
  const db = readDb()
  const user = db.users.find((u) => u.id === req.userId)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  return res.json({ user: sanitizeUser(user) })
})

app.put('/api/profile', auth, (req, res) => {
  const { name, phone, medicalInfo, contacts } = req.body || {}
  const db = readDb()
  const user = db.users.find((u) => u.id === req.userId)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  if (name) user.name = name
  if (typeof phone === 'string') user.phone = phone
  if (typeof medicalInfo === 'string') user.medicalInfo = medicalInfo
  if (Array.isArray(contacts)) {
    user.contacts = contacts.map((c) => ({
      id: c.id || uuid(),
      name: c.name,
      phone: c.phone
    }))
  }
  writeDb(db)
  return res.json({ user: sanitizeUser(user) })
})

app.get('/api/dashboard', auth, (req, res) => {
  const db = readDb()
  const rides = db.rides.filter((r) => r.userId === req.userId)
  const issues = db.issues.filter((i) => i.userId === req.userId)
  const sosEvents = db.sosEvents.filter((s) => s.userId === req.userId)
  const totalDistance = rides.reduce((acc, r) => acc + (r.distanceKm || 0), 0)
  const nightRides = rides.filter((r) => r.type === 'Night').length
  const safetyScore =
    rides.length === 0
      ? 0
      : Math.round(rides.reduce((acc, r) => acc + (r.safetyScore || 0), 0) / rides.length)
  return res.json({
    stats: {
      totalRides: rides.length,
      nightRides,
      emergencyCount: sosEvents.length,
      safetyScore,
      totalDistanceKm: Number(totalDistance.toFixed(1))
    },
    rides: rides.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    issues: issues
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
  })
})

app.get('/api/rides', auth, (req, res) => {
  const db = readDb()
  const rides = db.rides.filter((r) => r.userId === req.userId)
  return res.json({ rides })
})

app.post('/api/rides', auth, (req, res) => {
  const { name, durationMin, distanceKm, type, safetyScore } = req.body || {}
  if (!name) {
    return res.status(400).json({ error: 'Ride name required' })
  }
  const db = readDb()
  const ride = {
    id: uuid(),
    userId: req.userId,
    name,
    durationMin: Number(durationMin || 0),
    distanceKm: Number(distanceKm || 0),
    type: type || 'Day',
    safetyScore: Number(safetyScore || 0),
    createdAt: new Date().toISOString()
  }
  db.rides.push(ride)
  writeDb(db)
  return res.status(201).json({ ride })
})

app.put('/api/rides/:id', auth, (req, res) => {
  const { id } = req.params
  const { name, durationMin, distanceKm, type, safetyScore } = req.body || {}
  const db = readDb()
  const ride = db.rides.find((r) => r.id === id && r.userId === req.userId)
  if (!ride) {
    return res.status(404).json({ error: 'Ride not found' })
  }
  if (name) ride.name = name
  if (durationMin !== undefined) ride.durationMin = Number(durationMin || 0)
  if (distanceKm !== undefined) ride.distanceKm = Number(distanceKm || 0)
  if (type) ride.type = type
  if (safetyScore !== undefined) ride.safetyScore = Number(safetyScore || 0)
  writeDb(db)
  return res.json({ ride })
})

app.delete('/api/rides/:id', auth, (req, res) => {
  const { id } = req.params
  const db = readDb()
  const index = db.rides.findIndex((r) => r.id === id && r.userId === req.userId)
  if (index === -1) {
    return res.status(404).json({ error: 'Ride not found' })
  }
  const [removed] = db.rides.splice(index, 1)
  writeDb(db)
  return res.json({ ride: removed })
})

app.get('/api/issues', auth, (req, res) => {
  const db = readDb()
  const issues = db.issues.filter((i) => i.userId === req.userId)
  return res.json({ issues })
})

app.post('/api/issues', auth, (req, res) => {
  const { title, priority, notes } = req.body || {}
  if (!title || !priority) {
    return res.status(400).json({ error: 'Title and priority required' })
  }
  const db = readDb()
  const issue = {
    id: uuid(),
    userId: req.userId,
    title,
    priority,
    notes: notes || '',
    status: 'In review',
    createdAt: new Date().toISOString()
  }
  db.issues.push(issue)
  writeDb(db)
  const user = db.users.find((u) => u.id === req.userId)
  notifyOwnerIssue({ email: user?.email || 'unknown', title, status: issue.status })
  return res.status(201).json({ issue })
})

app.put('/api/issues/:id', auth, (req, res) => {
  const { id } = req.params
  const { title, priority, notes, status } = req.body || {}
  const db = readDb()
  const issue = db.issues.find((i) => i.id === id && i.userId === req.userId)
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' })
  }
  if (title) issue.title = title
  if (priority) issue.priority = priority
  if (notes !== undefined) issue.notes = notes
  if (status) issue.status = status
  writeDb(db)
  const user = db.users.find((u) => u.id === req.userId)
  notifyOwnerIssue({ email: user?.email || 'unknown', title: issue.title, status: issue.status })
  return res.json({ issue })
})

app.delete('/api/issues/:id', auth, (req, res) => {
  const { id } = req.params
  const db = readDb()
  const index = db.issues.findIndex((i) => i.id === id && i.userId === req.userId)
  if (index === -1) {
    return res.status(404).json({ error: 'Issue not found' })
  }
  const [removed] = db.issues.splice(index, 1)
  writeDb(db)
  return res.json({ issue: removed })
})

app.get('/api/contacts', auth, (req, res) => {
  const db = readDb()
  const user = db.users.find((u) => u.id === req.userId)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  return res.json({ contacts: user.contacts || [] })
})

app.post('/api/contacts', auth, (req, res) => {
  const { contacts } = req.body || {}
  if (!Array.isArray(contacts)) {
    return res.status(400).json({ error: 'Contacts must be an array' })
  }
  const db = readDb()
  const user = db.users.find((u) => u.id === req.userId)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  user.contacts = contacts.map((c) => ({
    id: c.id || uuid(),
    name: c.name,
    phone: c.phone
  }))
  writeDb(db)
  return res.json({ contacts: user.contacts })
})

app.get('/api/tracking/status', auth, (req, res) => {
  const db = readDb()
  const user = db.users.find((u) => u.id === req.userId)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  return res.json({ activeRide: user.activeRide || null })
})

app.post('/api/tracking/start', auth, (req, res) => {
  const { name } = req.body || {}
  const db = readDb()
  const user = db.users.find((u) => u.id === req.userId)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  if (user.activeRide) {
    return res.status(409).json({ error: 'Ride already active' })
  }
  user.activeRide = {
    id: uuid(),
    name: name || 'Active Ride',
    startedAt: new Date().toISOString()
  }
  writeDb(db)
  return res.json({ activeRide: user.activeRide })
})

app.post('/api/tracking/stop', auth, (req, res) => {
  const { distanceKm, type, safetyScore } = req.body || {}
  const db = readDb()
  const user = db.users.find((u) => u.id === req.userId)
  if (!user || !user.activeRide) {
    return res.status(404).json({ error: 'No active ride' })
  }
  const start = new Date(user.activeRide.startedAt).getTime()
  const end = Date.now()
  const durationMin = Math.max(1, Math.round((end - start) / 60000))
  const ride = {
    id: uuid(),
    userId: req.userId,
    name: user.activeRide.name,
    durationMin,
    distanceKm: Number(distanceKm || 0),
    type: type || 'Day',
    safetyScore: Number(safetyScore || 0),
    createdAt: new Date().toISOString()
  }
  db.rides.push(ride)
  user.activeRide = null
  writeDb(db)
  return res.json({ ride })
})

app.post('/api/sos', auth, (req, res) => {
  const { message, location } = req.body || {}
  const db = readDb()
  const event = {
    id: uuid(),
    userId: req.userId,
    message: message || 'Emergency alert triggered',
    location: location || 'Unknown location',
    createdAt: new Date().toISOString()
  }
  db.sosEvents.push(event)
  writeDb(db)
  const user = db.users.find((u) => u.id === req.userId)
  notifyOwnerSos({ email: user?.email || 'unknown', location })
  return res.status(201).json({ sos: event })
})

app.get('/api/export/rides.csv', auth, (req, res) => {
  const db = readDb()
  const rides = db.rides.filter((r) => r.userId === req.userId)
  const header = 'name,durationMin,distanceKm,type,safetyScore,createdAt'
  const rows = rides.map(
    (r) =>
      `${r.name},${r.durationMin},${r.distanceKm},${r.type},${r.safetyScore},${r.createdAt}`
  )
  const csv = [header, ...rows].join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename=\"rides.csv\"')
  res.send(csv)
})

app.get('/api/export/issues.csv', auth, (req, res) => {
  const db = readDb()
  const issues = db.issues.filter((i) => i.userId === req.userId)
  const header = 'title,priority,status,notes,createdAt'
  const rows = issues.map(
    (i) => `${i.title},${i.priority},${i.status},${i.notes},${i.createdAt}`
  )
  const csv = [header, ...rows].join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename=\"issues.csv\"')
  res.send(csv)
})

app.get('/api/export/summary.pdf', auth, (req, res) => {
  const db = readDb()
  const user = db.users.find((u) => u.id === req.userId)
  const rides = db.rides.filter((r) => r.userId === req.userId)
  const issues = db.issues.filter((i) => i.userId === req.userId)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'attachment; filename=\"summary.pdf\"')
  const doc = new PDFDocument({ margin: 40 })
  doc.pipe(res)
  doc.fontSize(18).text('BikeGuard Summary', { underline: true })
  doc.moveDown()
  doc.fontSize(12).text(`Name: ${user?.name || ''}`)
  doc.text(`Email: ${user?.email || ''}`)
  doc.text(`Phone: ${user?.phone || ''}`)
  doc.text(`Medical Info: ${user?.medicalInfo || ''}`)
  doc.moveDown()
  doc.fontSize(14).text('Recent Rides')
  rides.slice(0, 10).forEach((ride) => {
    doc.fontSize(11).text(
      `${ride.name} • ${ride.durationMin} min • ${ride.distanceKm} km • ${ride.type} • Score ${ride.safetyScore}`
    )
  })
  doc.moveDown()
  doc.fontSize(14).text('Recent Issues')
  issues.slice(0, 10).forEach((issue) => {
    doc.fontSize(11).text(`${issue.title} • ${issue.priority} • ${issue.status}`)
  })
  doc.end()
})

app.get('/api/admin/overview', auth, requireAdmin, (req, res) => {
  const db = readDb()
  return res.json({
    users: db.users.map(sanitizeUser),
    rides: db.rides,
    issues: db.issues,
    sosEvents: db.sosEvents
  })
})

app.use('/data', (req, res) => {
  res.status(404).end()
})

app.use(express.static(path.join(__dirname)))

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`BikeGuard backend running on http://localhost:${PORT}`)
})
