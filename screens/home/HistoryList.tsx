import { FlatList, ListRenderItemInfo, Text, View } from 'react-native';
import { ScrollView, TouchableOpacity } from 'react-native-gesture-handler';
import Transaction, { ITransaction } from '../../models/Transaction';

import { ChainIdsSymbol } from '../../common/Networks';
import { Coin } from '../../components';
import React from 'react';
import { formatAddress } from '../../utils/formatter';
import { observer } from 'mobx-react-lite';
import { secondaryFontColor } from '../../constants/styles';
import { utils } from 'ethers';

interface Props {
  data: Transaction[];
  onTxPress?: (tx: Transaction) => void;
}

const Methods = new Map([
  ['0xa9059cbb', 'Sent'],
  ['0x095ea7b3', 'Approve'],
]);

const StatusColor = {
  Confirmed: 'yellowgreen',
  Failed: 'crimson',
  Pending: 'deepskyblue',
};

const Tx = observer(({ item, onPress }: { onPress?: (tx: Transaction) => void; item: Transaction }) => {
  const method = (item.data as string).substring(0, 10);

  const tokenSymbol = item.readableInfo?.symbol ?? ChainIdsSymbol.get(item.chainId!);
  const amount = item.readableInfo?.amount ?? utils.formatEther(item.value ?? '0');
  const methodName = Methods.get(method) ?? (item.data !== '0x' ? 'Contract Interaction' : `Sent`);
  const to = item.readableInfo?.recipient ?? item.to;
  const status = item.blockNumber ? (item.status ? 'Confirmed' : 'Failed') : 'Pending';

  return (
    <TouchableOpacity style={{ paddingVertical: 12, paddingHorizontal: 8 }} onPress={() => onPress?.(item as Transaction)}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flex: 1, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Coin symbol={tokenSymbol} size={14} />
          <Text style={{ fontSize: 16, marginHorizontal: 4 }}>{`${methodName} ${amount} ${tokenSymbol}`}</Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: StatusColor[status],
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '300', fontSize: 12 }}>{status}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontWeight: '300' }}>{`To: ${utils.isAddress(to!) ? formatAddress(to!, 7, 5) : to}`}</Text>
        <Text style={{ fontWeight: '300' }}>
          {new Date(item.timestamp ?? 0).toLocaleString(undefined, { dateStyle: 'short' })}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

export default observer(({ data, onTxPress }: Props) => {
  const renderItem = ({ item, index }: ListRenderItemInfo<Transaction>) => <Tx item={item} onPress={onTxPress} />;

  return (
    <FlatList
      data={data}
      keyExtractor={(i) => `${i.hash} ${i.blockNumber} ${i.timestamp}`}
      renderItem={renderItem}
      style={{ paddingHorizontal: 16 }}
    />
  );
});