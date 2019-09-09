/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const createError = require('http-errors');
const express = require('express');
const morgan = require('morgan');
const session = require('express-session');
const http = require('http');
const path = require('path');
const PUBLIC_DIR = path.join(__dirname, 'public');

const app = express();

app.use(morgan('dev'));
app.use(express.urlencoded({extended: false}));

app.use(session({
  secret: 'notverysecret',
  resave: true,
  saveUninitialized: false,
}));

app.get('/dashboard', (req, res) => {
  if (req.session.user) {
    res.sendFile('./dashboard.html', {root: PUBLIC_DIR});
  } else {
    res.status(401).sendFile('./unauthenticated.html', {root: PUBLIC_DIR});
  }
});

app.get('/', (req, res) => {
  if (req.session.user) {
    res.send('<span>You are logged in. Go to <a href="/dashboard">the dashboard</a>.</span>');
  } else {
    res.send(`
      <form class="login-form" action="/login" method="post">
        <label>
          Email:
          <input type="email" name="email">
        </label>
        <label>
          Password:
          <input type="password" name="password">
        </label>
        <input type="submit">
      </form> 
    `);
  }
});

app.post('/login', (req, res, next) => {
  const {email, password} = req.body;
  if (email !== 'admin@example.com' || password !== 'password') {
    return next(createError(401));
  }

  req.session.user = {
    email,
  };
  res.redirect('/dashboard');
});

app.get('/logout', (req, res, next) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Error handlers
app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = err;

  res.status(err.status || 500);
  res.json({err});
});

const server = http.createServer(app);
if (require.main === module) {
  server.listen(8000);
} else {
  module.exports = server;
}
