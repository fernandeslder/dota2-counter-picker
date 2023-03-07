import os
import pickle
import constants
import requests
from bs4 import BeautifulSoup
import re
import json
import pandas as pd
import logging
logger = logging.getLogger(__name__)


def load_data():
    logger.info("Loading Data")
    global dbuff_adv_data
    global dbuff_wr_data
    with open(f'{constants.DATA_PATH}/dbuff_adv_data.pkl', 'rb') as file_load:
        dbuff_adv_data = pickle.load(file_load)
    with open(f'{constants.DATA_PATH}/dbuff_wr_data.pkl', 'rb') as file_load:
        dbuff_wr_data = pickle.load(file_load)
    logger.info("Loading Data Complete")


def cumulative_advantage(hero_list):
    df_sum_adv = dbuff_adv_data[hero_list[0]]
    for i in hero_list[1:]:
        df_sum_adv = df_sum_adv + dbuff_adv_data[i]
    return df_sum_adv


def average_win_rate(hero_list):
    df_avg_wr = dbuff_wr_data[hero_list[0]]
    for i in hero_list[1:]:
        df_avg_wr = df_avg_wr + dbuff_wr_data[i]
    return df_avg_wr / len(hero_list)


def individual_advantage(hero_list):
    ind_adv_dict = {}
    for i in hero_list:
        ind_adv_dict[i] = dbuff_adv_data[i].to_dict()
    return ind_adv_dict


def final_data(hero_list):
    logger.info("Calculating Final Data")

    final_data_dict = individual_advantage(hero_list)
    df_sum_adv = cumulative_advantage(hero_list)
    df_avg_wr = average_win_rate(hero_list)
    final_data_dict['Cumulative Advantage'] = df_sum_adv.to_dict()
    final_data_dict['Average Enemy WR'] = df_avg_wr.to_dict()

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
        if link.find("div", class_="hero"):
            heroes.append({"hero_name": link.text.strip(), "link_name": link['href'][8:]})

    all_hero_names_list = [hero_dict['hero_name'] for hero_dict in heroes]

    # Dumping Hero Names
    with open(f'{constants.DATA_PATH}/all_hero_names_list.json', 'w') as hero_names_out:
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
    with open(f'{constants.DATA_PATH}/dbuff_adv_data.pkl', 'wb') as file_dump:
        pickle.dump(df_adv, file_dump)
    with open(f'{constants.DATA_PATH}/dbuff_wr_data.pkl', 'wb') as file_dump:
        pickle.dump(df_wr, file_dump)
    logger.info("Syncing Hero Advantage and Win Rate Data Complete")


# initially load data
if os.path.isfile(f'{constants.DATA_PATH}/dbuff_adv_data.pkl') \
        and os.path.isfile(f'{constants.DATA_PATH}/dbuff_wr_data.pkl'):
    load_data()
else:
    sync_data()
