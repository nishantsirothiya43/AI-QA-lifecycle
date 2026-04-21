# 🧪 Feature: OrangeHRM Demo Login Page Testing

## 📌 Application Under Test

* **URL:** https://opensource-demo.orangehrmlive.com/
* **Module:** Authentication (Login)

---

## 🎯 Objective

Validate core login functionality with minimal high-value test coverage.

---

## 🧾 Test Data

| Scenario      | Username | Password |
| ------------- | -------- | -------- |
| Valid Login   | Admin    | admin123 |
| Invalid Login | Admin    | wrong123 |
| Empty Fields  | —        | —        |

---

## ✅ Test Cases

### 1. Login with Valid Credentials

**Steps:**

1. Open login page
2. Enter username: `Admin`
3. Enter password: `admin123`
4. Click Login

**Expected Result:**

* User is redirected to dashboard
* Dashboard is visible

---

### 2. Login with Invalid Credentials

**Steps:**

1. Enter username: `Admin`
2. Enter password: `wrong123`
3. Click Login

**Expected Result:**

* Error message displayed: *Invalid credentials*
* User remains on login page

---

### 3. Login with Empty Fields

**Steps:**

1. Leave username blank
2. Leave password blank
3. Click Login

**Expected Result:**

* Validation messages displayed:

  * Username: *Required*
  * Password: *Required*

---

## 📊 Priority

* High: All above cases (critical login coverage)
