import pickle
import constants


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


with open(f'{constants.DATA_PATH}/dbuff_adv_data.pkl', 'rb') as file_load:
    dbuff_adv_data = pickle.load(file_load)
with open(f'{constants.DATA_PATH}/dbuff_wr_data.pkl', 'rb') as file_load:
    dbuff_wr_data = pickle.load(file_load)
