# 🏢 Adhams ERP Beginner's Guide

Welcome to the **Adhams ERP** project! This guide is designed to help you, even if you don't have a technical background, understand what this project is and how to use it step by step.

---

## 🌟 1. What is this Project?

**Adhams ERP** (Enterprise Resource Planning) is a complete management software. Think of it as a digital command center for the entire business. It helps you keep track of things that are going on, rather than using multiple Excel sheets, notebooks, or different apps.

It currently features:
- **Inventory Tracking:** See what items you have in stock (like Louver PVC, Laminate Sheets, etc.).
- **Purchase Orders (POs):** Manage requests to buy new materials from your suppliers.
- **Goods Receipt Notes (GRNs):** Log whenever new supplies arrive at the warehouse. Even if only part of a requested order arrives (Partial Goods Receipt).
- **Quality Inspections:** Track the quality of supplies that arrive.
- **AI Chat Widget:** A helpful assistant that can offer quick answers and help customers or users with guidance.

---

## 🚀 2. How to Open the App

The project runs in two main pieces:
1. **The Backend (Server & Database):** The invisible brain holding all your data.
2. **The Frontend (Web App):** The visible dashboard you click around on. 

*(Good news! Your computer is currently running both right now in the background).*

**Step-by-Step to open:**
1. Open your favorite web browser (Google Chrome, Edge, Safari, etc.).
2. Go to the address bar at the top and type in: **`http://localhost:5173`** (or whatever URL your terminal displays) and press **Enter**.
3. You will see the login screen or dashboard for the Adhams ERP open up!

---

## 🗺️ 3. How to Use the System (Step-by-Step)

### A. Logging In
- When the screen loads, if it asks for a username/password, type in your credentials.
- *Your access level automatically gives you the correct permissions (e.g., Warehouse Manager vs Admin).*

### B. The Main Dashboard Navigation
- **The Sidebar Menus:** On the left side of the screen, you will see a navigation menu. This is your main remote control.
- You can click on menus like **Inventory**, **Purchases**, or **Analytics** to jump between different parts of the business. 
- *On Mobile phones*, this sidebar is collapsible—you might need to tap a "hamburger" (three horizontal lines) icon at the top left to see the menu. 

### C. Receiving New Inventory (Goods Receipt Notes)
When a delivery truck arrives with materials you ordered:
1. Click on **Purchases** from the sidebar menu, then go to **Receipts (GRN)**.
2. Click **Add New Receipt**.
3. Fill in the form: What item arrived? How many? 
4. **Partial Receipts:** If you ordered 100 Laminate Sheets but the supplier only delivered 50 today, you can enter 50. The system remembers you're still owed 50 more!
5. **Quality Check:** Log if there were damaged goods directly on this form.
6. Click **Save**. Your inventory numbers will magically update across the whole system!

### D. Finding Information Fast (AI Widget)
- You might see a **Chat Bubble Icon** floating on the screen.
- Click it to open up the AI assistant. 
- You can treat it just like talking to a real human assistant. 

---

## 🛠️ 4. What if Something Goes Wrong?

- **"The page isn't loading!"** 
  - Simply make sure the developer servers are running. (Right now, they are fully running behind the scenes!)
- **"I have an unauthorized error!"**
  - Just log out and log back in! Sometimes your "session ticket" expires.

---

### 🎉 You are all set!
The best way to learn is simply to click around and explore. We've built safety nets so you can't easily break things. Happy managing!

---

## 📚 5. Technical Documentation
If you are a developer or want to understand how this project was built and structured under the hood (the code, databases, and monorepo setup), please check out the [**Project Architecture Guide**](./PROJECT_ARCHITECTURE.md).
