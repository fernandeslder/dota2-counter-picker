# **Dota 2 Counter Picker**
The Dota 2 Counter Picker App scrapes and displays data from dotabuff in an simple and intuitive way so that the user can visualise which heroes are best against the enemy heroes selected.

The app is deployed at https://dota2-counter-picker.onrender.com/. Please note that it may take some time to load (approximately 2 to 5 minutes) as it is hosted on a free instance that puts the app to sleep if it is unused for 15 minutes.

<p align="center">
    <a href="https://dota2-counter-picker.onrender.com/">
        <img src = "demo-gif/demo.gif">
    </a>
</p>

## **Table of Contents:**

1. <a href="#1-about">About</a>
2. <a href="#2-running-the-main-branch-locally">Running the Main Branch Locally</a>
3. <a href="#3-technologies-used">Technologies Used</a>
4. <a href="#4-branches">Branches</a>
5. <a href="#5-folder-structure">Folder Structure</a>

## <a>**1. About**</a>

The Dota 2 Counter Picker app utilizes web scraping to gather all the current hero data, images, and counter data from dotabuff. On sync the counter data is fetched from the past week, but can be modified by adjusting the filter (DBUFF_FILTERS = '?date=week') located in constants.py to their liking. Once the data is gathered, it can then be displayed on the frontend web application.

Users can select up to 5 enemy heroes to see how other heroes fare against them. The search bar can also be used to quickly find and select enemy heroes. For each counter hero, the app displays individual advantage, as well as "Cumulative Advantage" and "Average WR vs Enemies". Additionally, the app provides sorting functionality for each of these counter hero metrics.

## <a>**2. Running the Main Branch Locally**</a>

### a. Prerequisites
Before running the main branch of the application locally, ensure that you have the following installed:
- Python (3.8.8)
- Node.js (v18.15.0)
- NPM (9.6.1)

Additionally, you will need credentials for a Google Cloud service account with the Google Drive API enabled. Save the credentials file as "creds.json" in the base directory.

### b. Installing Python Requirements
To install the Python requirements, run the following command in the root directory of the application:
```
pip install -r requirements.txt
```
It is recommended to create and activate a virtual environment before running the command.

### c. Configuring the React App
Before running the React app, you need to configure it to point to the local server. To do this, follow these steps:
1. Navigate to `dota2-counter-picker\dota2-counter-picker-frontend\src\components\HeroPicker.js.`
2. Change `"https://dota2-counter-picker.onrender.com/getHeroData"` to `"http://127.0.0.1:5000/getHeroData"`.

### d. Building the React App
To build the React app, navigate to the `dota2-counter-picker\dota2-counter-picker-frontend\` directory and run the following commands:
```
npm install
npm run build
```

### e. Running the Application
To start the local server, navigate back to the root directory and activate the virtual environment (if created). Then run the following command:
```
python app.py
```
You can access the application by opening a web browser and visiting `http://127.0.0.1:5000/`.

### f. Deployment command
The command used for deployment can be found in the Procfile (for heroku) and below for Render:
```
gunicorn -w 4 -k sync --worker-connections 1000 --timeout 1000 app:app
```

## <a>**3. Technologies Used**</a>
- **React** for the frontend
- **Flask** for the backend
- **BeautifulSoup** for web scraping
- **Pandas** for data manipulation
- **PyDrive** for Google Drive synchronization
- **Render** to host the application
- **Make** (formerly Integromat) scenarios to schedule sync calls (as cron-job.org has 30 seconds max timeout)
- **Papertrail** for logs

## <a>**4. Branches**</a>
This repository has 3 major branches:

- **main** - the main branch which is deployed on render.com

- **local_deployment** - which can be run as is, will sync the data to local file system, uses scheduler to sync the data at 12 hour intervals, it does not have an API endpoint to sync data, it does not have any limiter to rate limit api requests.

- **local_gdrive** - which was used to test implementing Google Drive as the file system to store the pickled data files. Requires credentials for a Google Cloud service account with Google Drive API enabled in the base directory as "creds.json".

## <a>**5. Folder Structure**</a>
```
dota2-counter-picker
|-- dota2-counter-picker-frontend
|   |-- build
|   |-- node_modules
|   |-- public
|   |   |-- assets
|   |   |   |-- img
|   |   |   |   |-- Abaddon.jpg
|   |   |   |   |-- Alchemist.jpg
|   |   |   |   |-- Ancient Apparition.jpg
|   |   |   |   |-- ....jpg
|   |   |-- favicon.ico
|   |   |-- index.html
|   |-- src
|   |   |-- components
|   |   |   |-- Dota2DataTable.css
|   |   |   |-- Dota2DataTable.js
|   |   |   |-- HeroPicker.css
|   |   |   |-- HeroPicker.js
|   |   |-- data
|   |   |   |-- all_hero_names_list.json
|   |   |-- App.css
|   |   |-- App.js
|   |   |-- index.css
|   |   |-- index.js
|   |-- package-lock.json
|   |-- package.json
|-- logs
|   |-- app.log
|-- temp
|   |-- dbuff_adv_data.pkl
|   |-- dbuff_wr_data.pkl
|-- app.py
|-- constants.py
|-- controllers.py
|-- scheduler.py
|-- services.py
|-- utils.py
|-- requirements.txt
|-- creds.json
|-- Procfile
|-- .env
|-- README.md
```
