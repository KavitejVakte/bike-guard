window.GOOGLE_MAPS_API_KEY = window.GOOGLE_MAPS_API_KEY || ''

const pages = document.querySelectorAll('.page')
const viewButtons = document.querySelectorAll('[data-view]')
const navButtons = document.querySelectorAll('.nav-button')
const modalTriggers = document.querySelectorAll('[data-modal]')
const modalCloseButtons = document.querySelectorAll('[data-modal-close]')
const cursorDot = document.getElementById('cursorDot')
const cursorRing = document.getElementById('cursorRing')
const scrollProgress = document.getElementById('scrollProgress')
const reveals = document.querySelectorAll('.reveal')
const counters = document.querySelectorAll('[data-count]')
const resolveApiBase = () => {
  if (window.PUBLIC_API_URL) return window.PUBLIC_API_URL
  if (window.location.protocol === 'file:') return ''
  return ''
}

const API_BASE = resolveApiBase().replace(/\/$/, '')
const authTokenKey = 'bikeguard_token'
const signOutButton = document.querySelector('.dashboard-actions .btn.ghost')
const sosButton = document.querySelector('.btn.danger')
const rideTable = document.querySelector('#rides .table')
const issueList = document.querySelector('#issues .list')
const adminLink = document.getElementById('admin-link')
const adminButton = document.getElementById('admin-button')
const profileForm = document.querySelector('form[data-form="profile"]')
const startRideButton = document.getElementById('start-ride')
const stopRideButton = document.getElementById('stop-ride')
const rideTimer = document.getElementById('ride-timer')
const rideName = document.getElementById('ride-name')
const rideNameInput = document.getElementById('ride-name-input')
const adminRefreshButton = document.getElementById('admin-refresh')
const adminExportButton = document.getElementById('admin-export')
const exportRidesButton = document.getElementById('export-rides')
const exportIssuesButton = document.getElementById('export-issues')
const topbar = document.getElementById('topbar')
const testimonialTrack = document.getElementById('testimonialTrack')
const menuToggle = document.getElementById('menuToggle')
const navPanel = document.getElementById('navPanel')

const state = {
  token: null,
  user: null,
  rides: [],
  issues: [],
  contacts: [],
  stats: null,
  activeRide: null
}

let rideTimerInterval = null

const closeNavPanel = () => {
  if (!navPanel || !menuToggle) return
  navPanel.classList.remove('open')
  menuToggle.classList.remove('is-open')
  menuToggle.setAttribute('aria-expanded', 'false')
}

const getStorage = () => {
  try {
    localStorage.setItem('__bikeguard_test', '1')
    localStorage.removeItem('__bikeguard_test')
    return localStorage
  } catch (err) {
    try {
      sessionStorage.setItem('__bikeguard_test', '1')
      sessionStorage.removeItem('__bikeguard_test')
      return sessionStorage
    } catch (innerErr) {
      return null
    }
  }
}

const storage = getStorage()
state.token = storage ? storage.getItem(authTokenKey) : null

const setToken = (token) => {
  state.token = token
  if (!storage) return
  if (token) {
    storage.setItem(authTokenKey, token)
  } else {
    storage.removeItem(authTokenKey)
  }
}

const apiFetch = async (path, options = {}) => {
  if (!API_BASE) {
    throw new Error(
      'Server not reachable. Set PUBLIC_API_URL for this environment and ensure the backend is online.'
    )
  }
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`
  }
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    })
  } catch (err) {
    throw new Error('Network error. Make sure the server is running and reachable.')
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const error = new Error(payload.error || 'Request failed')
    error.status = response.status
    throw error
  }
  return response.json()
}

const showPage = (id) => {
  pages.forEach((page) => page.classList.toggle('active', page.id === id))
  navButtons.forEach((button) =>
    button.classList.toggle('active', button.dataset.view === id)
  )
  closeNavPanel()
  window.location.hash = id
  triggerReveal()
}

viewButtons.forEach((button) => {
  button.addEventListener('click', () => showPage(button.dataset.view))
})

const handleHash = () => {
  const hash = window.location.hash.replace('#', '')
  if (!hash) return
  const target = document.getElementById(hash)
  if (target) showPage(hash)
}

window.addEventListener('hashchange', handleHash)
handleHash()

const triggerReveal = () => {
  reveals.forEach((el) => {
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight * 0.85) {
      el.classList.add('visible')
    }
  })
}

const animateCounters = () => {
  counters.forEach((counter) => {
    if (counter.dataset.animated) return
    const rect = counter.getBoundingClientRect()
    if (rect.top < window.innerHeight * 0.85) {
      counter.dataset.animated = 'true'
      const target = Number(counter.dataset.count || 0)
      const output = counter.querySelector('.count')
      let current = 0
      const step = Math.max(1, Math.floor(target / 40))
      const tick = () => {
        current = Math.min(target, current + step)
        if (output) output.textContent = current
        if (current < target) requestAnimationFrame(tick)
      }
      tick()
    }
  })
}

const onScroll = () => {
  triggerReveal()
  animateCounters()
  updateScrollProgress()
  updateTopbarShadow()
}

window.addEventListener('scroll', onScroll)
window.addEventListener('load', onScroll)

const updateScrollProgress = () => {
  if (!scrollProgress) return
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
  const progress = scrollHeight > 0 ? (window.scrollY / scrollHeight) * 100 : 0
  scrollProgress.style.width = `${progress}%`
}

const updateTopbarShadow = () => {
  if (!topbar) return
  topbar.classList.toggle('scrolled', window.scrollY > 10)
}

const hoverCapable =
  window.matchMedia &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches

if (cursorDot && cursorRing && hoverCapable) {
  window.addEventListener('mousemove', (event) => {
    cursorDot.style.opacity = '1'
    cursorRing.style.opacity = '1'
    cursorDot.style.left = `${event.clientX}px`
    cursorDot.style.top = `${event.clientY}px`
    cursorRing.style.left = `${event.clientX}px`
    cursorRing.style.top = `${event.clientY}px`
  })

  window.addEventListener('mouseleave', () => {
    cursorDot.style.opacity = '0'
    cursorRing.style.opacity = '0'
  })

  window.addEventListener('mousedown', () => {
    cursorDot.style.opacity = '1'
    cursorRing.style.opacity = '1'
    cursorRing.classList.add('cursor-active')
  })

  window.addEventListener('mouseup', () => {
    cursorRing.classList.remove('cursor-active')
  })
}

const magneticButtons = document.querySelectorAll('.magnetic')
if (hoverCapable) {
  magneticButtons.forEach((button) => {
    button.addEventListener('mousemove', (event) => {
      const rect = button.getBoundingClientRect()
      const x = event.clientX - rect.left - rect.width / 2
      const y = event.clientY - rect.top - rect.height / 2
      button.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`
    })
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translate(0, 0)'
    })
  })
}

const tiltElements = document.querySelectorAll('[data-tilt]')
if (hoverCapable) {
  tiltElements.forEach((card) => {
    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width - 0.5
      const y = (event.clientY - rect.top) / rect.height - 0.5
      card.style.transform = `rotateX(${y * -8}deg) rotateY(${x * 8}deg)`
    })
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'rotateX(0deg) rotateY(0deg)'
    })
  })
}

if (menuToggle && navPanel) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navPanel.classList.toggle('open')
    menuToggle.classList.toggle('is-open', isOpen)
    menuToggle.setAttribute('aria-expanded', String(isOpen))
  })
  window.addEventListener('resize', () => {
    if (window.innerWidth > 720) closeNavPanel()
  })
}

const showMessage = (message) => {
  window.alert(message)
}

const setLoading = (form, isLoading) => {
  const button = form.querySelector('button[type="submit"]')
  if (!button) return
  if (isLoading) {
    button.dataset.originalText = button.textContent
    button.textContent = 'Saving...'
    button.disabled = true
  } else {
    button.textContent = button.dataset.originalText || 'Submit'
    button.disabled = false
  }
}

const parseContacts = (raw) => {
  if (!raw) return []
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => {
      if (entry.includes(':')) {
        const [name, phone] = entry.split(':').map((part) => part.trim())
        return { name, phone }
      }
      return { name: `Contact ${index + 1}`, phone: entry }
    })
}

const openModal = (id, options = {}) => {
  const modal = document.getElementById(`${id}-modal`)
  if (!modal) return
  if (id === 'ride' && options.reset !== false) {
    const form = modal.querySelector('form[data-form="ride"]')
    if (form) {
      form.reset()
      form.querySelector('input[name="mode"]').value = 'create'
      form.querySelector('input[name="rideId"]').value = ''
    }
  }
  modal.classList.add('open')
  modal.setAttribute('aria-hidden', 'false')
}

const closeModal = (modal) => {
  if (!modal) return
  modal.classList.remove('open')
  modal.setAttribute('aria-hidden', 'true')
}

modalTriggers.forEach((trigger) => {
  trigger.addEventListener('click', () => {
    openModal(trigger.dataset.modal)
  })
})

modalCloseButtons.forEach((button) => {
  button.addEventListener('click', () => {
    closeModal(button.closest('.modal'))
  })
})

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    const openModalEl = document.querySelector('.modal.open')
    if (openModalEl) closeModal(openModalEl)
  }
})

const forms = document.querySelectorAll('form[data-form]')
forms.forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    handleFormSubmit(form)
  })
})

const handleFormSubmit = async (form) => {
  const formType = form.dataset.form
  const data = new FormData(form)
  try {
    setLoading(form, true)
    if (formType === 'login') {
      const email = data.get('email')
      const password = data.get('password')
      const payload = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })
      setToken(payload.token)
      state.user = payload.user
      await refreshDashboard()
      showPage('dashboard')
    } else if (formType === 'signup') {
      const fullName = data.get('name')
      const email = data.get('email')
      const password = data.get('password')
      const contactsRaw = data.get('contacts')
      const contacts = parseContacts(contactsRaw)
      const payload = await apiFetch('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name: fullName, email, password, contacts })
      })
      setToken(payload.token)
      state.user = payload.user
      await refreshDashboard()
      showPage('dashboard')
    } else if (formType === 'issue') {
      const title = data.get('title')
      const priority = data.get('priority')
      const notes = data.get('notes') || ''
      await apiFetch('/issues', {
        method: 'POST',
        body: JSON.stringify({ title, priority, notes })
      })
      await refreshDashboard()
      closeModal(document.getElementById('issue-modal'))
      form.reset()
    } else if (formType === 'issue-edit') {
      const issueId = data.get('issueId')
      const title = data.get('title')
      const priority = data.get('priority')
      const status = data.get('status')
      const notes = data.get('notes') || ''
      await apiFetch(`/issues/${issueId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, priority, status, notes })
      })
      await refreshDashboard()
      closeModal(document.getElementById('issue-edit-modal'))
      form.reset()
    } else if (formType === 'ride') {
      const mode = data.get('mode')
      const rideId = data.get('rideId')
      const name = data.get('name')
      const durationMin = Number(data.get('durationMin') || 0)
      const distanceKm = Number(data.get('distanceKm') || 0)
      const type = data.get('type')
      const safetyScore = Number(data.get('safetyScore') || 0)
      if (mode === 'edit') {
        await apiFetch(`/rides/${rideId}`, {
          method: 'PUT',
          body: JSON.stringify({ name, durationMin, distanceKm, type, safetyScore })
        })
      } else {
        await apiFetch('/rides', {
          method: 'POST',
          body: JSON.stringify({ name, durationMin, distanceKm, type, safetyScore })
        })
      }
      await refreshDashboard()
      closeModal(document.getElementById('ride-modal'))
      form.reset()
    } else if (formType === 'ride-stop') {
      const distanceKm = Number(data.get('distanceKm') || 0)
      const type = data.get('type')
      const safetyScore = Number(data.get('safetyScore') || 0)
      await apiFetch('/tracking/stop', {
        method: 'POST',
        body: JSON.stringify({ distanceKm, type, safetyScore })
      })
      await refreshDashboard()
      closeModal(document.getElementById('ride-stop-modal'))
      form.reset()
    } else if (formType === 'profile') {
      const name = data.get('name')
      const phone = data.get('phone')
      const medicalInfo = data.get('medicalInfo')
      const contactsRaw = data.get('contacts')
      const contacts = parseContacts(contactsRaw)
      await apiFetch('/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, phone, medicalInfo, contacts })
      })
      await refreshDashboard()
    }
  } catch (err) {
    showMessage(err.message)
  } finally {
    setLoading(form, false)
  }
}

const updateStats = (stats) => {
  if (!stats) return
  const statCards = document.querySelectorAll('.stat-card')
  statCards.forEach((card) => {
    const label = card.querySelector('.label')?.textContent?.trim()
    const count = card.querySelector('.count')
    if (!label || !count) return
    if (label === 'Total rides') {
      card.dataset.count = stats.totalRides
      count.textContent = stats.totalRides
      const chip = card.querySelector('.chip')
      if (chip) chip.textContent = `${stats.totalDistanceKm} km`
    }
    if (label === 'Night rides') {
      card.dataset.count = stats.nightRides
      count.textContent = stats.nightRides
    }
    if (label === 'Emergency count') {
      card.dataset.count = stats.emergencyCount
      count.textContent = stats.emergencyCount
    }
    if (label === 'Safety score') {
      card.dataset.count = stats.safetyScore
      count.textContent = stats.safetyScore
    }
  })
}

const renderRides = (rides) => {
  const recentList = document.querySelector('#dashboard .panel .list')
  if (recentList) {
    recentList.innerHTML = ''
    rides.slice(0, 3).forEach((ride) => {
      const item = document.createElement('div')
      item.className = 'list-item'
      item.innerHTML = `
        <div>
          <p>${ride.name}</p>
          <span class="muted">${ride.durationMin} min · ${ride.distanceKm} km</span>
        </div>
        <span class="chip">${ride.type} ride</span>
      `
      recentList.appendChild(item)
    })
  }
  const table = document.querySelector('#rides .table')
  if (table) {
    const header = table.querySelector('.table-row.header')
    table.innerHTML = ''
    if (header) table.appendChild(header)
    rides.forEach((ride) => {
      const row = document.createElement('div')
      row.className = 'table-row'
      row.dataset.rideId = ride.id
      row.innerHTML = `
        <span>${ride.name}</span>
        <span>${ride.durationMin} min</span>
        <span>${ride.distanceKm} km</span>
        <span class="chip">${ride.type}</span>
        <span>${ride.safetyScore}</span>
        <span>
          <button class="btn ghost" data-action="edit-ride">Edit</button>
          <button class="btn ghost" data-action="delete-ride">Delete</button>
        </span>
      `
      table.appendChild(row)
    })
  }
}

const renderIssues = (issues) => {
  const list = document.querySelector('#issues .list')
  if (!list) return
  list.innerHTML = ''
  issues.forEach((issue) => {
    const item = document.createElement('div')
    item.className = 'list-item'
    item.dataset.issueId = issue.id
    item.innerHTML = `
      <div>
        <p>${issue.title}</p>
        <span class="muted">Logged ${new Date(issue.createdAt).toLocaleDateString()} · Priority: ${
      issue.priority
    }</span>
      </div>
      <div class="issue-actions">
        <span class="chip">${issue.status}</span>
        <button class="btn ghost" data-action="edit-issue">Edit</button>
        <button class="btn ghost" data-action="delete-issue">Delete</button>
      </div>
    `
    list.appendChild(item)
  })
}

const renderContacts = (contacts) => {
  const list = document.querySelector('#sos ul')
  if (!list) return
  list.innerHTML = ''
  contacts.forEach((contact) => {
    const item = document.createElement('li')
    item.textContent = `${contact.name} · ${contact.phone}`
    list.appendChild(item)
  })
}

const refreshDashboard = async () => {
  try {
    const [{ user }, dashboard, { contacts }, rides, issues, tracking] = await Promise.all([
      apiFetch('/me'),
      apiFetch('/dashboard'),
      apiFetch('/contacts'),
      apiFetch('/rides'),
      apiFetch('/issues'),
      apiFetch('/tracking/status')
    ])
    state.user = user
    state.stats = dashboard.stats
    state.rides = rides.rides
    state.issues = issues.issues
    state.contacts = contacts
    state.activeRide = tracking.activeRide
    const welcome = document.querySelector('#dashboard .dashboard-top h2')
    if (welcome) welcome.textContent = state.user.name
    updateStats(state.stats)
    renderRides(state.rides)
    renderIssues(state.issues)
    renderContacts(state.contacts)
    hydrateProfileForm()
    updateAdminVisibility()
    updateTrackingUI()
    renderAdmin()
    triggerReveal()
    animateCounters()
  } catch (err) {
    if (err.status === 401) {
      setToken(null)
      state.user = null
      showPage('login')
      return
    }
    throw err
  }
}

const hydrateProfileForm = () => {
  if (!profileForm || !state.user) return
  profileForm.querySelector('input[name="name"]').value = state.user.name || ''
  profileForm.querySelector('input[name="email"]').value = state.user.email || ''
  profileForm.querySelector('input[name="phone"]').value = state.user.phone || ''
  profileForm.querySelector('textarea[name="medicalInfo"]').value =
    state.user.medicalInfo || ''
  const contactsText = (state.contacts || [])
    .map((c) => `${c.name}: ${c.phone}`)
    .join(', ')
  profileForm.querySelector('input[name="contacts"]').value = contactsText
}

const updateAdminVisibility = () => {
  const isAdmin = state.user?.role === 'admin'
  if (adminLink) adminLink.style.display = isAdmin ? 'inline-flex' : 'none'
  if (adminButton) adminButton.style.display = isAdmin ? 'flex' : 'none'
}

const renderAdmin = async () => {
  if (state.user?.role !== 'admin') return
  const data = await apiFetch('/admin/overview')
  const userList = document.getElementById('admin-users')
  const sosList = document.getElementById('admin-sos')
  if (userList) {
    userList.innerHTML = ''
    data.users.forEach((user) => {
      const item = document.createElement('div')
      item.className = 'list-item'
      item.innerHTML = `
        <div>
          <p>${user.name}</p>
          <span class="muted">${user.email} · ${user.role}</span>
        </div>
      `
      userList.appendChild(item)
    })
  }
  if (sosList) {
    sosList.innerHTML = ''
    data.sosEvents.slice().reverse().slice(0, 8).forEach((sos) => {
      const item = document.createElement('div')
      item.className = 'list-item'
      item.innerHTML = `
        <div>
          <p>${sos.message}</p>
          <span class="muted">${new Date(sos.createdAt).toLocaleString()}</span>
        </div>
      `
      sosList.appendChild(item)
    })
  }
}

const updateTrackingUI = () => {
  if (!rideTimer || !rideName) return
  if (state.activeRide) {
    rideName.textContent = state.activeRide.name
    stopRideButton.disabled = false
    startRideButton.disabled = true
    rideNameInput.disabled = true
    startRideTimer(state.activeRide.startedAt)
  } else {
    rideName.textContent = 'No ride active'
    stopRideButton.disabled = true
    startRideButton.disabled = false
    rideNameInput.disabled = false
    stopRideTimer()
  }
}

const startRideTimer = (startedAt) => {
  stopRideTimer()
  const start = new Date(startedAt).getTime()
  rideTimerInterval = setInterval(() => {
    const diff = Date.now() - start
    const hours = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    rideTimer.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(
      2,
      '0'
    )}:${String(secs).padStart(2, '0')}`
  }, 1000)
}

const stopRideTimer = () => {
  if (rideTimerInterval) clearInterval(rideTimerInterval)
  rideTimerInterval = null
  if (rideTimer) rideTimer.textContent = '00:00:00'
}

const downloadFile = async (path, filename) => {
  try {
    const response = await fetch(`${API_BASE}${path}`)
    if (!response.ok) throw new Error('Download failed')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    showMessage(err.message)
  }
}

const loadGoogleMaps = () => {
  if (!window.GOOGLE_MAPS_API_KEY) return
  const script = document.createElement('script')
  script.src = `https://maps.googleapis.com/maps/api/js?key=${window.GOOGLE_MAPS_API_KEY}&callback=initMap`
  script.async = true
  window.initMap = () => {
    const mapElement = document.getElementById('map')
    if (!mapElement) return
    const defaultCenter = { lat: 40.7128, lng: -74.006 }
    const map = new google.maps.Map(mapElement, {
      center: defaultCenter,
      zoom: 13,
      disableDefaultUI: true
    })
    const hazards = [
      { lat: 40.719, lng: -74.002, label: 'Hazard Zone A' },
      { lat: 40.705, lng: -74.011, label: 'Hazard Zone B' }
    ]
    hazards.forEach((zone) => {
      new google.maps.Marker({
        position: zone,
        map,
        title: zone.label
      })
    })
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const position = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        map.setCenter(position)
        new google.maps.Marker({ position, map, title: 'Current location' })
      })
    }
  }
  document.head.appendChild(script)
}

if (sosButton) {
  sosButton.addEventListener('click', async () => {
    try {
      if (!state.user) {
        showPage('login')
        return
      }
      await apiFetch('/sos', {
        method: 'POST',
        body: JSON.stringify({
          message: 'SOS triggered from BikeGuard dashboard',
          location: 'Downtown Grid · Sector 4'
        })
      })
      await refreshDashboard()
      showMessage('SOS sent to your emergency contacts.')
    } catch (err) {
      showMessage(err.message)
    }
  })
}

if (signOutButton) {
  signOutButton.addEventListener('click', () => {
    setToken(null)
    state.user = null
    showPage('landing')
  })
}

if (rideTable) {
  rideTable.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action="delete-ride"]')
    const editButton = event.target.closest('button[data-action="edit-ride"]')
    if (editButton) {
      const row = editButton.closest('.table-row')
      const rideId = row?.dataset.rideId
      const ride = state.rides.find((r) => r.id === rideId)
      if (!ride) return
      const form = document.querySelector('form[data-form="ride"]')
      form.querySelector('input[name="rideId"]').value = ride.id
      form.querySelector('input[name="mode"]').value = 'edit'
      form.querySelector('input[name="name"]').value = ride.name
      form.querySelector('input[name="durationMin"]').value = ride.durationMin
      form.querySelector('input[name="distanceKm"]').value = ride.distanceKm
      form.querySelector('select[name="type"]').value = ride.type
      form.querySelector('input[name="safetyScore"]').value = ride.safetyScore
      openModal('ride', { reset: false })
      return
    }
    if (!button) return
    const row = button.closest('.table-row')
    const rideId = row?.dataset.rideId
    if (!rideId) return
    if (!confirm('Delete this ride?')) return
    try {
      await apiFetch(`/rides/${rideId}`, { method: 'DELETE' })
      await refreshDashboard()
    } catch (err) {
      showMessage(err.message)
    }
  })
}

if (issueList) {
  issueList.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action="delete-issue"]')
    const editButton = event.target.closest('button[data-action="edit-issue"]')
    if (editButton) {
      const item = editButton.closest('.list-item')
      const issueId = item?.dataset.issueId
      const issue = state.issues.find((i) => i.id === issueId)
      if (!issue) return
      const form = document.querySelector('form[data-form="issue-edit"]')
      form.querySelector('input[name="issueId"]').value = issue.id
      form.querySelector('input[name="title"]').value = issue.title
      form.querySelector('select[name="priority"]').value = issue.priority
      form.querySelector('select[name="status"]').value = issue.status
      form.querySelector('textarea[name="notes"]').value = issue.notes || ''
      openModal('issue-edit')
      return
    }
    if (!button) return
    const item = button.closest('.list-item')
    const issueId = item?.dataset.issueId
    if (!issueId) return
    if (!confirm('Delete this issue?')) return
    try {
      await apiFetch(`/issues/${issueId}`, { method: 'DELETE' })
      await refreshDashboard()
    } catch (err) {
      showMessage(err.message)
    }
  })
}

if (startRideButton) {
  startRideButton.addEventListener('click', async () => {
    try {
      if (!state.user) {
        showPage('login')
        return
      }
      const name = rideNameInput?.value || 'Active Ride'
      await apiFetch('/tracking/start', {
        method: 'POST',
        body: JSON.stringify({ name })
      })
      await refreshDashboard()
    } catch (err) {
      showMessage(err.message)
    }
  })
}

if (stopRideButton) {
  stopRideButton.addEventListener('click', () => {
    openModal('ride-stop')
  })
}

if (adminRefreshButton) {
  adminRefreshButton.addEventListener('click', () => {
    renderAdmin().catch(() => {})
  })
}

if (adminExportButton) {
  adminExportButton.addEventListener('click', () => {
    downloadFile('/export/summary.pdf', 'summary.pdf')
  })
}

if (exportRidesButton) {
  exportRidesButton.addEventListener('click', () => {
    downloadFile('/export/rides.csv', 'rides.csv')
  })
}

if (exportIssuesButton) {
  exportIssuesButton.addEventListener('click', () => {
    downloadFile('/export/issues.csv', 'issues.csv')
  })
}

const startTestimonials = () => {
  if (!testimonialTrack) return
  let index = 0
  setInterval(() => {
    index = (index + 1) % testimonialTrack.children.length
    testimonialTrack.style.transform = `translateX(-${index * 260}px)`
  }, 4000)
}

if (state.token) {
  refreshDashboard().catch(() => {
    setToken(null)
    state.user = null
  })
}

startTestimonials()
loadGoogleMaps()
