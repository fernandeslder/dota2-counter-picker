import pickle
import constants
import requests
from bs4 import BeautifulSoup
import re
import json
import pandas as pd


def reload_data():
    global dbuff_adv_data
    global dbuff_wr_data
    with open(f'{constants.DATA_PATH}/dbuff_adv_data.pkl', 'rb') as file_reload:
        dbuff_adv_data = pickle.load(file_reload)
    with open(f'{constants.DATA_PATH}/dbuff_wr_data.pkl', 'rb') as file_reload:
        dbuff_wr_data = pickle.load(file_reload)


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
        ind_adv_dict[i] = ind_adv_dict[i].to_dict()
    return ind_adv_dict


def final_data(hero_list):
    final_data_dict = individual_advantage(hero_list)
    df_sum_adv = cumulative_advantage(hero_list)
    df_avg_wr = average_win_rate(hero_list)
    final_data_dict['Cumulative Advantage'] = df_sum_adv.to_dict()
    final_data_dict['Average Enemy WR'] = df_avg_wr.to_dict()


# def sync_data():


def sync_hero_names():
    headers = {constants.HEADER_USER_AGENT: constants.HEADER_USER_AGENT_VALUE}

    req = requests.get(constants.DBUFF_HERO_URL, headers=headers)
    soup = BeautifulSoup(req.content, "html.parser")
    hero_links = soup.find_all("a", href=re.compile(r"/heroes/.*"))
    heroes = []
    for link in hero_links:
        if link.find("div", class_="hero"):
            heroes.append({"hero_name": link.text.strip(), "link_name": link['href'][8:]})

    all_hero_names_list = [hero_dict['hero_name'] for hero_dict in heroes]
    with open(f'{constants.DATA_PATH}/all_hero_names_list.json', 'w') as hero_names_out:
        hero_names_out.write(json.dumps(all_hero_names_list))
    return heroes


with open(f'{constants.DATA_PATH}/dbuff_adv_data.pkl', 'rb') as file_load:
    dbuff_adv_data = pickle.load(file_load)
with open(f'{constants.DATA_PATH}/dbuff_wr_data.pkl', 'rb') as file_load:
    dbuff_wr_data = pickle.load(file_load)
