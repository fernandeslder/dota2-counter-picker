import os
import io
import pickle
import constants
import requests
from bs4 import BeautifulSoup
import re
import json
import pandas as pd
import logging
import urllib.request as urlibrequest
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload


logger = logging.getLogger(__name__)


# loads pre-existing dotabuff data into global variable for access by service
def load_data():
    logger.info("Loading Data")
    global dbuff_adv_data
    global dbuff_wr_data
    creds = Credentials.from_service_account_file('creds.json')
    drive_service = build('drive', 'v3', credentials=creds)
    dbuff_adv_data_id = drive_service.files().list(q=f"name = 'dbuff_adv_data.pkl' and '{constants.FOLDER_ID}' in parents",
                                                    fields="files(id)").execute().get("files")[0]['id']
    dbuff_wr_data_id = drive_service.files().list(q=f"name = 'dbuff_wr_data.pkl' and '{constants.FOLDER_ID}' in parents",
                                                    fields="files(id)").execute().get("files")[0]['id']
    dbuff_adv_data = pickle.loads(drive_service.files().get_media(fileId=dbuff_adv_data_id).execute())
    dbuff_wr_data = pickle.loads(drive_service.files().get_media(fileId=dbuff_wr_data_id).execute())
    logger.info("Loading Data Complete")


# calcualtes cumulative advantage vs selected enemy heroes
def cumulative_advantage(hero_list):
    df_sum_adv = dbuff_adv_data[hero_list[0]]
    for i in hero_list[1:]:
        df_sum_adv = df_sum_adv + dbuff_adv_data[i]
    return df_sum_adv


# calcualtes cumulative advantage vs selected enemy heroes
def average_win_rate(hero_list):
    df_avg_wr = dbuff_wr_data[hero_list[0]]
    for i in hero_list[1:]:
        df_avg_wr = df_avg_wr + dbuff_wr_data[i]
    df_avg_wr = df_avg_wr / len(hero_list)
    return 100 - df_avg_wr


# creates dict for advantage of all other heroes for each individual hero in list
def individual_advantage(hero_list):
    ind_adv_dict = {}
    for i in hero_list:
        ind_adv_dict[i] = dbuff_adv_data[i].to_dict()
    return ind_adv_dict


# creates dict for the final data to be returned to controller 
def final_data(hero_list):
    logger.info("Calculating Final Data")

    final_data_dict = individual_advantage(hero_list)
    df_sum_adv = cumulative_advantage(hero_list)
    df_avg_wr = average_win_rate(hero_list)
    final_data_dict['Cumulative Advantage'] = df_sum_adv.to_dict()
    final_data_dict['Average WR vs Enemies'] = df_avg_wr.to_dict()

    logger.info("Calculating Final Data Complete")
    return final_data_dict


def sync_data():
    logger.info("Syncing Data")
    heroes = sync_hero_names()
    sync_hero_adv_wr(heroes)
    load_data()
    logger.info("Syncing Data Complete")


def sync_hero_names():
    logger.info("Syncing Hero Names Data")

    # Syncing Hero Names and Links
    headers = {constants.HEADER_USER_AGENT: constants.HEADER_USER_AGENT_VALUE}
    req = requests.get(constants.DBUFF_HERO_URL, headers=headers)
    soup = BeautifulSoup(req.content, "html.parser")
    hero_links = soup.find_all("a", href=re.compile(r"/heroes/.*"))
    heroes = []
    for link in hero_links:
        hero_div = link.find("div", class_="hero")
        if hero_div:
            hero_name = hero_div.find("div", class_="name").text.strip()
            link_name = link['href'][8:]
            heroes.append({"hero_name": hero_name, "link_name": link_name})

            # Downloading hero background image
            img_url = f"https://www.dotabuff.com{hero_div['style'][16:-1]}"
            img_path = f"{constants.FRONTEND_IMG_PATH}/{hero_name}.jpg"
            if not os.path.isfile(img_path):
                img_req = requests.get(img_url, headers=headers)
                with open(img_path, 'wb') as img_file:
                    img_file.write(img_req.content)

    all_hero_names_list = [hero_dict['hero_name'] for hero_dict in heroes]

    # Dumping Hero Names
    with open(f'{constants.FRONTEND_DATA_PATH}/all_hero_names_list.json', 'w') as hero_names_out:
        hero_names_out.write(json.dumps(all_hero_names_list))

    logger.info("Syncing Hero Names Data Complete")
    return heroes


def sync_hero_adv_wr(heroes):
    logger.info("Syncing Hero Advantage and Win Rate Data")

    data_dict_adv = {}
    data_dict_wr = {}
    headers = {constants.HEADER_USER_AGENT: constants.HEADER_USER_AGENT_VALUE}

    for hero in heroes:
        data_url = f"{constants.DBUFF_HERO_URL}/{hero['link_name']}/counters{constants.DBUFF_FILTERS}"
        req = requests.get(data_url, headers=headers)
        soup = BeautifulSoup(req.content, "html.parser")
        header = soup.find("header", string="Matchups")
        table = header.find_next_sibling("article").find("table")

        for row in table.find_all("tr"):
            counter_name_tag = row.find("a", class_="link-type-hero")
            if row.find("td") and counter_name_tag:
                advantage = row.find_all("td")[2]['data-value']
                wr = row.find_all("td")[3]['data-value']
                data_dict_adv.setdefault(counter_name_tag.text.strip(), {})[hero['hero_name']] = float(advantage)
                data_dict_wr.setdefault(counter_name_tag.text.strip(), {})[hero['hero_name']] = float(wr)
        logger.info(f"Hero Synced: {hero['hero_name']}")

    df_adv = pd.DataFrame.from_dict(data_dict_adv, orient='index')
    df_wr = pd.DataFrame.from_dict(data_dict_wr, orient='index')
    df_adv = df_adv.fillna(0)
    df_wr = df_wr.fillna(50)

    creds = Credentials.from_service_account_file('creds.json')
    drive_service = build('drive', 'v3', credentials=creds)
    adv_file_metadata = {'name': 'dbuff_adv_data.pkl', 'parents': [constants.FOLDER_ID]}
    drive_service.files().create(body=adv_file_metadata, media_body=MediaIoBaseUpload(io.BytesIO(pickle.dumps(df_adv)), mimetype='application/octet-stream'),
                                                fields='id').execute()
    wr_file_metadata = {'name': 'dbuff_wr_data.pkl', 'parents': [constants.FOLDER_ID]}
    drive_service.files().create(body=wr_file_metadata, media_body=MediaIoBaseUpload(io.BytesIO(pickle.dumps(df_wr)), mimetype='application/octet-stream'),
                                            fields='id').execute()
    logger.info("Syncing Hero Advantage and Win Rate Data Complete")


# initially load data
creds = Credentials.from_service_account_file('creds.json')
drive_service = build('drive', 'v3', credentials=creds)
logger.info("Checking if file exists in GDrive")
adv_file = drive_service.files().list(q=f"name = 'dbuff_adv_data.pkl' and '{constants.FOLDER_ID}' in parents",
                                        fields="files(id)").execute().get("files")
wr_file = drive_service.files().list(q=f"name = 'dbuff_wr_data.pkl' and '{constants.FOLDER_ID}' in parents",
                                        fields="files(id)").execute().get("files")
if adv_file and wr_file:
    logger.info("GDrive files found")
    load_data()
else:
    logger.info("GDrive files NOT found")
    sync_data()
