import * as Linking from 'expo-linking';

import Bookmarks, { Bookmark, isRiskySite, isSecureSite } from '../../viewmodels/customs/Bookmarks';
import { Dimensions, ListRenderItemInfo, Share, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { EvilIcons, Ionicons } from '@expo/vector-icons';
import { NullableImage, SafeViewContainer } from '../../components';
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Web3View, { PageMetadata } from './Web3View';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { renderBookmarkItem, renderUserBookmarkItem } from './components/BookmarkItem';
import { secureColor, thirdFontColor } from '../../constants/styles';

import { Bar } from 'react-native-progress';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import CachedImage from 'react-native-expo-cached-image';
import Collapsible from 'react-native-collapsible';
import { FlatGrid } from 'react-native-super-grid';
import { Modalize } from 'react-native-modalize';
import Networks from '../../viewmodels/Networks';
import PopularDApps from '../../configs/urls/popular.json';
import { Portal } from 'react-native-portalize';
import { ReactiveScreen } from '../../utils/device';
import RecentHistory from './components/RecentHistory';
import { StatusBar } from 'expo-status-bar';
import SuggestUrls from '../../configs/urls/verified.json';
import Theme from '../../viewmodels/settings/Theme';
import ViewShot from 'react-native-view-shot';
import i18n from '../../i18n';
import { isURL } from '../../utils/url';
import { observer } from 'mobx-react-lite';
import { startLayoutAnimation } from '../../utils/animations';
import { useModalize } from 'react-native-modalize/lib/utils/use-modalize';

const calcIconSize = () => {
  const { width } = ReactiveScreen;

  const NumOfColumns = Math.ceil(width / 64);
  const LargeIconSize = (width - 8 - 16 * NumOfColumns) / NumOfColumns;
  const SmallIconSize = (width - 16 - 16 * (NumOfColumns + 1)) / (NumOfColumns + 1);

  return { NumOfColumns, LargeIconSize, SmallIconSize };
};

const { LargeIconSize, SmallIconSize } = calcIconSize();

interface Props extends BottomTabScreenProps<any, never> {
  onPageLoaded?: (pageId: number, metadata?: PageMetadata) => void;
  onPageLoadEnd?: () => void;
  onHome?: () => void;
  onTakeOff?: () => void;
  pageId: number;
  onNewTab?: () => void;
  globalState?: { pageCount: number; activePageId: number };
  onOpenTabs?: () => void;
  setCapture?: (callback: () => Promise<string>) => void;
  onInputting?: (inputting: boolean) => void;
}

export const Browser = observer(
  ({
    navigation,
    onPageLoaded,
    onHome,
    onTakeOff,
    pageId,
    onNewTab,
    globalState,
    onOpenTabs,
    setCapture,
    onPageLoadEnd,
    onInputting,
  }: Props) => {
    const { t } = i18n;
    const { top } = useSafeAreaInsets();
    const { current } = Networks;
    const webview = useRef<WebView>(null);
    const addrRef = useRef<TextInput>(null);
    const viewShot = useRef<ViewShot>(null);

    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isFocus, setFocus] = useState(false);
    const [hostname, setHostname] = useState('');
    const [webUrl, setWebUrl] = useState('');

    const [addr, setAddr] = useState('');
    const [uri, setUri] = useState<string>('');
    const [pageMetadata, setPageMetadata] = useState<{ icon: string; title: string; desc?: string; origin: string }>();
    const [suggests, setSuggests] = useState<string[]>([]);
    const [webRiskLevel, setWebRiskLevel] = useState('');
    const [isExpandedSite, setIsExpandedSite] = useState(false);
    const { ref: favsRef, open: openFavs, close: closeFavs } = useModalize();

    const [largeIconSize, setLargeIconSize] = useState(LargeIconSize);
    const [smallIconSize, setSmallIconSize] = useState(SmallIconSize);

    const { history, favs, recentSites } = Bookmarks;
    const { backgroundColor, textColor, borderColor, foregroundColor, isLightMode, statusBarStyle } = Theme;

    useEffect(() => {
      const handler = () => {
        const { LargeIconSize, SmallIconSize } = calcIconSize();

        setLargeIconSize(LargeIconSize);
        setSmallIconSize(SmallIconSize);
      };

      Dimensions.addEventListener('change', handler);

      PubSub.subscribe('CodeScan-https:', (msg, { data }) => {
        if (globalState?.activePageId !== pageId) return;

        addrRef.current?.blur();
        setTimeout(() => goTo(data), 1000);
      });

      return () => {
        Dimensions.removeEventListener('change', handler);
        PubSub.unsubscribe('CodeScan-https:');

        onInputting = undefined;
      };
    }, []);

    useEffect(() => onInputting?.(isFocus), [isFocus]);

    useEffect(() => {
      const func = viewShot.current?.capture;
      if (!func) return;

      setCapture?.(func);
    }, [viewShot.current]);

    useEffect(() => {
      isSecureSite(webUrl)
        ? setWebRiskLevel('verified')
        : isRiskySite(webUrl)
        ? setWebRiskLevel('risky')
        : webUrl.startsWith('https://')
        ? setWebRiskLevel('tls')
        : setWebRiskLevel('insecure');

      setIsExpandedSite(Bookmarks.isExpandedSite(webUrl));
    }, [webUrl]);

    const refresh = () => {
      webview.current?.reload();
    };

    const stopLoading = () => {
      webview.current?.stopLoading();
      setLoadingProgress(1);
    };

    const goHome = () => {
      setUri('');
      setAddr('');
      setWebUrl('');
      setHostname('');
      setLoadingProgress(0);
      webview.current?.clearHistory?.();
      addrRef.current?.blur();
      onHome?.();
    };

    const goTo = (url: string) => {
      url = url.toLowerCase();
      url =
        url.startsWith('https:') || url.startsWith('http:')
          ? url
          : isURL(url)
          ? `https://${url}`
          : `https://www.google.com/search?client=wallet3&ie=UTF-8&oe=UTF-8&q=${url}`;

      try {
        if (url === uri) {
          refresh();
          return url;
        }

        setPageMetadata(undefined);
        setAddr(url);
        setUri(url);
        setWebUrl(url);
        setHostname(Linking.parse(url).hostname!);
      } finally {
        addrRef.current?.blur();
      }

      onTakeOff?.();

      return url;
    };

    const onAddrSubmit = async () => {
      if (!addr) {
        goHome();
        return;
      }

      if (!addr.startsWith('http') && suggests[0]) {
        goTo(suggests[0]);
        return;
      }

      Bookmarks.submitHistory(goTo(addr));
    };

    const onNavigationStateChange = (event: WebViewNavigation) => {
      if (!event.url) return;

      setWebUrl(event.url);
      const hn = Linking.parse(event.url).hostname!;
      setHostname(hn.startsWith('www.') ? hn.substring(4) : hn);
    };

    const renderItem = (p: ListRenderItemInfo<Bookmark>) =>
      renderBookmarkItem({
        ...p,
        imageBackgroundColor: backgroundColor,
        iconSize: largeIconSize,
        onPress: (item) => {
          goTo(item.url);
          closeFavs();
        },
      });

    useEffect(() => {
      setSuggests(
        history
          .concat((SuggestUrls as string[]).filter((u) => !history.find((hurl) => hurl.includes(u) || u.includes(hurl))))
          .filter((url) => url.includes(addr) || addr.includes(url))
          .slice(0, 5)
      );
    }, [addr]);

    return (
      <View
        style={{
          backgroundColor: backgroundColor,
          flex: 1,
          width: ReactiveScreen.width,
          paddingTop: top,
          position: 'relative',
        }}
      >
        <View style={{ position: 'relative', paddingTop: 4, paddingBottom: isFocus ? 0 : 8 }}>
          <View
            style={{
              flexDirection: 'row',
              marginHorizontal: 6,
              paddingStart: 8,
              position: 'relative',
              alignItems: 'center',
            }}
          >
            <View style={{ position: 'relative', flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                ref={addrRef}
                autoCapitalize="none"
                keyboardType="web-search"
                placeholderTextColor="#dfdfdf"
                autoCorrect={false}
                placeholder={t('browser-enter-address')}
                selectTextOnFocus
                onFocus={() => setFocus(true)}
                onBlur={() => setFocus(false)}
                defaultValue={isFocus ? webUrl : undefined}
                value={isFocus ? undefined : hostname}
                onChangeText={(t) => setAddr(t)}
                onSubmitEditing={() => onAddrSubmit()}
                style={{
                  backgroundColor: isFocus ? '#fff' : isLightMode ? '#f5f5f5' : '#f5f5f520',
                  fontSize: 16,
                  paddingHorizontal: isFocus ? 8 : 20,
                  flex: 1,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: isFocus ? borderColor : 'transparent',
                  borderRadius: 7,
                  textAlign: isFocus ? 'auto' : 'center',
                  color:
                    (webRiskLevel === 'verified' || webRiskLevel === 'tls') && !isFocus
                      ? isLightMode
                        ? secureColor
                        : '#66db0d'
                      : webRiskLevel === 'risky'
                      ? 'red'
                      : undefined,
                }}
              />

              {isFocus ? undefined : webUrl.startsWith('https') ? (
                <TouchableOpacity style={{ position: 'absolute', left: 0, paddingStart: 8 }}>
                  {webRiskLevel === 'verified' ? (
                    <Ionicons
                      name="shield-checkmark"
                      color={isLightMode ? secureColor : '#66db0d'}
                      size={12}
                      style={{ marginTop: 2 }}
                    />
                  ) : webRiskLevel === 'risky' ? (
                    <Ionicons name="md-shield" color="red" size={12} style={{ marginTop: 2 }} />
                  ) : webRiskLevel === 'tls' ? (
                    <Ionicons name="lock-closed" color={foregroundColor} size={12} />
                  ) : undefined}
                </TouchableOpacity>
              ) : undefined}
              {isFocus ? undefined : (
                <TouchableOpacity
                  style={{ padding: 8, paddingHorizontal: 9, position: 'absolute', right: 0 }}
                  onPress={() => (loadingProgress === 1 ? refresh() : stopLoading())}
                >
                  {loadingProgress === 1 ? <Ionicons name="refresh" size={17} color={foregroundColor} /> : undefined}
                  {loadingProgress > 0 && loadingProgress < 1 ? (
                    <Ionicons name="close-outline" size={17} color={foregroundColor} />
                  ) : undefined}
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={{ padding: 6, marginStart: 8 }}
              disabled={loadingProgress < 1 || !pageMetadata}
              onPress={() =>
                Bookmarks.has(webUrl) ? Bookmarks.remove(webUrl) : Bookmarks.add({ ...pageMetadata!, url: webUrl })
              }
            >
              <Ionicons
                name={Bookmarks.has(webUrl) ? 'bookmark' : 'bookmark-outline'}
                size={17}
                color={loadingProgress < 1 ? 'lightgrey' : foregroundColor}
              />
            </TouchableOpacity>

            <TouchableOpacity style={{ padding: 4 }} onPress={onNewTab} disabled={loadingProgress < 1 || !pageMetadata}>
              <Ionicons name={'add-outline'} size={23} color={loadingProgress < 1 ? 'lightgrey' : foregroundColor} />
            </TouchableOpacity>
          </View>

          <Collapsible collapsed={!isFocus} style={{ borderWidth: 0, padding: 0, margin: 0 }} enablePointerEvents>
            <View style={{ marginTop: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: borderColor }}>
              {suggests.map((url, index) => (
                <TouchableOpacity
                  key={url}
                  onPress={() => goTo(url)}
                  style={{
                    backgroundColor: index === 0 ? `${current.color}` : 'transparent',
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{ maxWidth: '80%', fontSize: 16, color: index === 0 ? '#fff' : thirdFontColor }}
                  >
                    {url.startsWith('http') ? url : `https://${url}`}
                  </Text>
                  {index === 0 ? <Ionicons name="return-down-back" size={15} color="#fff" /> : undefined}
                </TouchableOpacity>
              ))}
            </View>

            {uri ? (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  padding: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: borderColor,
                }}
              >
                {PopularDApps.concat(favs.slice(0, 24 - PopularDApps.length)).map((item, i) => (
                  <TouchableOpacity
                    style={{ margin: 8 }}
                    key={`${item.url}-${i}`}
                    onPress={(e) => {
                      e.preventDefault();
                      goTo(item.url);
                    }}
                  >
                    <NullableImage
                      uri={item.icon}
                      imageBackgroundColor={backgroundColor}
                      imageRadius={3}
                      size={smallIconSize}
                      text={item.title}
                      fontSize={12}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            ) : undefined}

            <View style={{ flexDirection: 'row', paddingHorizontal: 0 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('QRScan', { tip: t('qrscan-tip-3') })}
                style={{
                  justifyContent: 'center',
                  paddingHorizontal: 16,
                  alignItems: 'center',
                  paddingVertical: 8,
                }}
              >
                <Ionicons name="md-scan-outline" size={21} color={textColor} />
              </TouchableOpacity>

              {webUrl ? (
                <TouchableOpacity
                  onPress={() => Share.share({ url: webUrl, title: pageMetadata?.title })}
                  style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingVertical: 8,
                    paddingHorizontal: 8,
                  }}
                >
                  <EvilIcons name="share-apple" size={28.7} color={textColor} />
                </TouchableOpacity>
              ) : undefined}
            </View>
          </Collapsible>

          {loadingProgress > 0 && loadingProgress < 1 ? (
            <Bar
              width={ReactiveScreen.width}
              color={current.color}
              height={2}
              borderWidth={0}
              borderRadius={0}
              progress={loadingProgress}
              style={{ position: 'absolute', bottom: 0 }}
            />
          ) : undefined}
        </View>

        {uri ? (
          <Web3View
            webViewRef={webview}
            viewShotRef={viewShot}
            tabCount={globalState?.pageCount}
            onTabPress={onOpenTabs}
            source={{ uri }}
            onLoadProgress={({ nativeEvent }) => setLoadingProgress(nativeEvent.progress)}
            onLoadEnd={() => {
              setLoadingProgress(1);
              onPageLoadEnd?.();
            }}
            onNavigationStateChange={onNavigationStateChange}
            onGoHome={goHome}
            expanded={isExpandedSite}
            onBookmarksPress={openFavs}
            onMetadataChange={(data) => {
              setPageMetadata(data);
              onPageLoaded?.(pageId, data);
              Bookmarks.addRecentSite(data);
            }}
            onShrinkRequest={(webUrl) => {
              Bookmarks.removeExpandedSite(webUrl);
              setIsExpandedSite(false);
            }}
            onExpandRequest={(webUrl) => {
              Bookmarks.addExpandedSite(webUrl);
              setIsExpandedSite(true);
            }}
          />
        ) : (
          <View style={{ flex: 1 }}>
            <Text style={{ marginHorizontal: 16, marginTop: 12, color: textColor }}>{t('browser-popular-dapps')}</Text>

            <FlatGrid
              style={{ marginTop: 2, padding: 0, paddingBottom: 36 }}
              contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 8, paddingTop: 2 }}
              itemDimension={LargeIconSize + 8}
              bounces={false}
              data={PopularDApps}
              itemContainerStyle={{ padding: 0, margin: 0, marginBottom: 4 }}
              spacing={8}
              keyExtractor={(v, index) => `${v.url}-${index}`}
              renderItem={renderItem}
            />

            {favs.length > 0 ? (
              <Text style={{ marginHorizontal: 16, marginTop: 12, color: textColor }}>{t('browser-favorites')}</Text>
            ) : undefined}

            <FlatGrid
              style={{ marginTop: 2, padding: 0, height: '100%' }}
              contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 8, paddingTop: 2 }}
              itemDimension={LargeIconSize + 8}
              bounces={false}
              data={favs}
              itemContainerStyle={{ padding: 0, margin: 0, marginBottom: 8 }}
              spacing={8}
              keyExtractor={(v, index) => `${v.url}-${index}`}
              renderItem={(p) =>
                renderUserBookmarkItem({
                  ...p,
                  iconSize: LargeIconSize,
                  imageBackgroundColor: backgroundColor,
                  onPress: (item) => {
                    goTo(item.url);
                    closeFavs();
                  },
                  onRemove: (item) => {
                    startLayoutAnimation();
                    Bookmarks.remove(item.url);
                  },
                })
              }
            />
          </View>
        )}

        {!webUrl && recentSites.length > 0 ? (
          <RecentHistory tabCount={globalState?.pageCount} onItemPress={(url) => goTo(url)} onTabsPress={onOpenTabs} />
        ) : undefined}

        <Portal>
          <Modalize
            ref={favsRef}
            adjustToContentHeight
            disableScrollIfPossible
            scrollViewProps={{ showsVerticalScrollIndicator: false, scrollEnabled: false }}
            modalStyle={{ padding: 0, margin: 0 }}
          >
            <SafeAreaProvider style={{ padding: 0, borderTopEndRadius: 7, borderTopStartRadius: 7 }}>
              <SafeViewContainer
                style={{ height: 439, backgroundColor, flex: 1, padding: 0, borderTopEndRadius: 6, borderTopStartRadius: 6 }}
              >
                <Text style={{ marginHorizontal: 12, color: textColor }}>{t('browser-favorites')}</Text>
                <FlatGrid
                  style={{ marginTop: 2, padding: 0, flex: 1 }}
                  contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 8, paddingTop: 2 }}
                  itemDimension={LargeIconSize + 8}
                  bounces={false}
                  renderItem={renderItem}
                  itemContainerStyle={{ padding: 0, margin: 0, marginBottom: 12 }}
                  spacing={8}
                  keyExtractor={(v, index) => `${v.url}-${index}`}
                  data={favs}
                />

                <RecentHistory
                  disableContextMenu
                  onItemPress={(url) => {
                    goTo(url);
                    closeFavs();
                  }}
                />
              </SafeViewContainer>
            </SafeAreaProvider>
          </Modalize>
        </Portal>

        <StatusBar style={statusBarStyle} />
      </View>
    );
  }
);

export default Browser;