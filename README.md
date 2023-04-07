# **Dota 2 Counter Picker**
The Dota 2 Counter Picker App scrapes and displays data from dotabuff in an simple and intuitive way so that the user can visualise which heroes are best against the enemy heroes selected.

The app is deployed at https://dota2-counter-picker.onrender.com/. Please note that it may take some time to load (approximately 2 to 5 minutes) as it is hosted on a free instance that puts the app to sleep if it is unused for 15 minutes.

## **Table of Contents:**

1. <a href="#1-about">About</a>

## <a>**1. About**</a>

The Dota 2 Counter Picker app utilizes web scraping to gather all the current hero data, images, and counter data from dotabuff. On sync the counter data is fetched from the past week, but can be modified by adjusting the filter (DBUFF_FILTERS = '?date=week') located in constants.py to their liking. Once the data is gathered, it can then be displayed on the frontend web application.

Users can select up to 5 enemy heroes to see how other heroes fare against them. The search bar can also be used to quickly find and select enemy heroes. For each counter hero, the app displays individual advantage, as well as "Cumulative Advantage" and "Average WR vs Enemies". Additionally, the app provides sorting functionality for each of these counter hero metrics.