const fs = require('fs')
const path = require('path')
require('dotenv').config()

const apiUrl = (process.env.PUBLIC_API_URL || '').trim().replace(/\/$/, '')

if (!apiUrl) {
  console.error('PUBLIC_API_URL is required to build env.js')
  process.exit(1)
}

const content = `window.PUBLIC_API_URL = ${JSON.stringify(apiUrl)};\n`
fs.writeFileSync(path.join(__dirname, '..', 'env.js'), content)
