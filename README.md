> [!TIP]
> This repository is mirrored on Forgejo:
> <https://forgejo.alexma.top/alexma233/arelux>

[English](README.md) | [简体中文](README.zh-Hans.md)

# arelux

> [!NOTE]
> Note: This project fully supports Tencent Cloud EdgeOne Global Edition (both China and International accounts can be used directly).

### Preview
<img width="989" height="1292" alt="image" src="https://github.com/user-attachments/assets/7488cd79-df76-43f3-aab0-193dab53e56c" />

This is a real-time monitoring dashboard built on the Tencent Cloud EdgeOne API, designed to provide intuitive traffic and request analytics.

## ✨ Key Features

- **Real-time overview**: Key metrics such as total requests, total traffic, and total bandwidth.
- **Multi-dimensional analytics**:
  - **Country/Region ranking**: Bilingual (Chinese/English) display for clear traffic source insights.
  - **Province / Status Code / Domain / URL / Resource Type**: Comprehensive Top N analysis.
- **Origin fetch analytics**: Monitor origin traffic, bandwidth, and request count to understand origin load.
- **Flexible querying**:
  - Custom time ranges (last 1 hour to last 31 days).
  - Switchable granularity (minute / hour / day / auto).
- **Customizable**: Support custom site title.

## 🚀 Quick Deploy

### Option 1: EdgeOne Pages (Recommended)

1. Fork this repository to your GitHub account.
2. Go to the [Tencent Cloud EdgeOne Console](https://console.cloud.tencent.com/edgeone) and create a Pages project.
3. Connect your GitHub repository.
4. Add the following in **Environment Variables**:
   - `SECRET_ID`: your Tencent Cloud SecretId
   - `SECRET_KEY`: your Tencent Cloud SecretKey
   - `SITE_NAME`: (optional) dashboard title; default is "arelux"
   - `SITE_ICON`: (optional) favicon URL; default is "https://q2.qlogo.cn/headimg_dl?dst_uin=2726730791&spec=0"
5. Deploy the project.

### Option 2: Run Locally / Node.js

1. Clone the repository:
   ```bash
   git clone https://github.com/alexma233/arelux
   cd arelux
   ```

2. Install dependencies:
   ```bash
   # install edgeone CLI
   npm install -g edgeone
   edgeone login
   # install dependencies
   npm install
   ```

3. Configure credentials:
   - **Method A (environment variables)**: create a `.env` file or export `SECRET_ID` and `SECRET_KEY` directly.
   - **Method B (file config)**: create `key.txt` in the project root with the following format (note: use the Chinese colon `：`):
     ```text
     SecretId：your SecretId
     SecretKey：your SecretKey
     ```

4. Start the dev server:
   ```bash
   edgeone pages dev
   ```

5. Open `http://localhost:8088`.

## 🔑 Permissions

Your Tencent Cloud access key must have **EdgeOne read-only access** (`QcloudTEOReadOnlyaccess`).
Create and manage keys (only **programmatic access** is needed) in the CAM console:
- **China Station**: <https://console.cloud.tencent.com/cam/user/userType>
- **International Station**: <https://console.tencentcloud.com/cam/user/userType>

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, Tencent Cloud SDK
- **Frontend**: HTML5, Tailwind CSS, ECharts
- **Deployment**: Tencent Cloud EdgeOne Pages
