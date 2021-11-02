import { FlatList, ListRenderItemInfo, StyleSheet, Text, View } from 'react-native';
import React, { useState } from 'react';
import { borderColor, fontColor, secondaryFontColor, themeColor } from '../../constants/styles';

import { Coin } from '../../components';
import { Feather } from '@expo/vector-icons';
import { IToken } from '../../common/Tokens';
import { RootNavigationProps } from '../navigations';
import Skeleton from '../../components/Skeleton';
import Swiper from 'react-native-swiper';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { formatCurrency } from '../../utils/formatter';
import { observer } from 'mobx-react-lite';
import { useNavigation } from '@react-navigation/core';

const Token = observer(({ item }: { item: IToken }) => {
  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: -16,
        paddingVertical: 16,
        paddingBottom: 13,
        paddingHorizontal: 22,
      }}
    >
      <Coin symbol={item.symbol} style={{ width: 36, height: 36, marginEnd: 16 }} iconUrl={item.iconUrl} />
      <Text style={{ fontSize: 18, color: fontColor }} numberOfLines={1}>
        {item.symbol}
      </Text>
      <View style={{ flex: 1 }} />

      {item.loading ? (
        <Skeleton />
      ) : (
        <Text style={{ fontSize: 19, color: fontColor }} numberOfLines={1}>
          {formatCurrency(item.amount || '0', '')}
        </Text>
      )}
    </TouchableOpacity>
  );
});

const Tokens = observer(({ tokens }: { tokens?: IToken[] }) => {
  const renderItem = ({ item, index }: ListRenderItemInfo<IToken>) => <Token item={item} />;

  return (tokens?.length ?? 0) > 0 ? (
    <FlatList
      data={tokens}
      keyExtractor={(i) => i.address}
      renderItem={renderItem}
      style={{ paddingHorizontal: 16 }}
      ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#efefef80', marginStart: 56 }} />}
    />
  ) : (
    <View style={{ flex: 1, padding: 16, paddingVertical: 12 }}>
      <Skeleton style={{ height: 52, width: '100%' }} />
    </View>
  );
});

export default observer(({ tokens }: { tokens?: IToken[] }) => {
  const [activeTab, setActiveTab] = useState(0);
  const swiper = React.useRef<Swiper>(null);

  const swipeTo = (index: number) => {
    swiper.current?.scrollTo(index);
    setActiveTab(index);
  };

  const navigation = useNavigation<RootNavigationProps>();

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <View style={styles.tabsContainer}>
          <Text
            style={{ ...styles.headerLabel, ...(activeTab === 0 ? styles.headerLabelActive : {}), paddingStart: 0 }}
            onPress={() => swipeTo(0)}
          >
            Assets
          </Text>
          <Text
            style={{ ...styles.headerLabel, ...(activeTab === 1 ? styles.headerLabelActive : {}) }}
            onPress={() => swipeTo(1)}
          >
            NFTs
          </Text>
          <Text
            style={{ ...styles.headerLabel, ...(activeTab === 2 ? styles.headerLabelActive : {}) }}
            onPress={() => swipeTo(2)}
          >
            History
          </Text>
        </View>

        {activeTab === 0 ? (
          <TouchableOpacity
            style={{ padding: 4, marginEnd: 0, marginBottom: -2 }}
            onPress={() => navigation.navigate('Tokens')}
          >
            <Feather name="more-horizontal" size={21} color={secondaryFontColor} style={{ opacity: 0.8 }} />
          </TouchableOpacity>
        ) : undefined}
      </View>

      <Swiper
        ref={swiper}
        showsPagination={false}
        loop={false}
        showsButtons={false}
        containerStyle={{ marginHorizontal: -16, paddingHorizontal: 0 }}
        style={{}}
        onIndexChanged={(i) => setActiveTab(i)}
      >
        <Tokens tokens={tokens} />
        <View style={{ flex: 1 }}>
          <Text>Nfts</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text>History</Text>
        </View>
      </Swiper>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: borderColor,
  },

  tabsContainer: {
    flexDirection: 'row',
    padding: 10,
    paddingStart: 8,
  },

  headerLabel: {
    textAlign: 'center',
    paddingHorizontal: 12,
    fontWeight: '500',
    fontSize: 15,
    color: secondaryFontColor,
  },

  headerLabelActive: {
    color: themeColor,
    fontWeight: '500',
  },

  text: { color: 'white', fontWeight: '500' },

  headline: {
    color: 'white',
    fontWeight: '500',
    fontSize: 27,
    fontFamily: 'Avenir Next',
  },
});