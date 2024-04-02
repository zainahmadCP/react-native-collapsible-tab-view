import React, { useState } from 'react'
import {
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native'
import Animated, {
  cancelAnimation,
  interpolate,
  interpolateColor,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { TabName } from '../types'
import { Indicator } from './Indicator'
import { MaterialTabItem } from './TabItem'
import { MaterialTabBarProps, ItemLayout } from './types'

export const TABBAR_HEIGHT = 48

/**
 * Basic usage looks like this:
 *
 * ```tsx
 * <Tabs.Container
 *   ...
 *   TabBarComponent={(props) => (
 *     <MaterialTabBar
 *       {...props}
 *       activeColor="red"
 *       inactiveColor="yellow"
 *       inactiveOpacity={1}
 *       labelStyle={{ fontSize: 14 }}
 *     />
 *   )}
 * >
 *   {...}
 * </Tabs.Container>
 * ```
 */
const MaterialTabBar = <T extends TabName = TabName>({
  tabNames,
  indexDecimal,
  scrollEnabled = false,
  indicatorStyle,
  index,
  TabItemComponent = MaterialTabItem,
  getLabelText = (name) => String(name).toUpperCase(),
  onTabPress,
  style,
  tabProps,
  contentContainerStyle,
  labelStyle,
  inactiveColor,
  activeColor,
  tabStyle,
  width: customWidth,
  keepActiveTabCentered,
  showDefaultTabs,
  showCount,
  counts,
  RF,
  RFT,
}: MaterialTabBarProps<T>): React.ReactElement => {
  const tabBarRef = useAnimatedRef<Animated.ScrollView>()
  const windowWidth = useWindowDimensions().width
  const width = customWidth ?? windowWidth
  const isFirstRender = React.useRef(true)
  const itemLayoutGathering = React.useRef(new Map<T, ItemLayout>())

  const tabsOffset = useSharedValue(0)
  const isScrolling = useSharedValue(false)

  const nTabs = tabNames.length

  const [indexData, setIndexData] = useState({
    selected: 0,
    listIndex: 0,
  });

  const [itemsLayout, setItemsLayout] = React.useState<ItemLayout[]>(
    scrollEnabled
      ? []
      : tabNames.map((_, i) => {
        const tabWidth = showDefaultTabs ? width / nTabs : nTabs != 2 ? ((80 * width) / 100) : (43 * width) / 100
        return { width: tabWidth, x: nTabs != 2 ? tabWidth : i * tabWidth }
      })
  )

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
    } else if (!scrollEnabled) {
      // update items width on window resizing
      const tabWidth = width / nTabs
      setItemsLayout(
        tabNames.map((_, i) => {
          return { width: tabWidth, x: i * tabWidth }
        })
      )
    }
  }, [scrollEnabled, nTabs, tabNames, width])

  const onTabItemLayout = React.useCallback(
    (event: LayoutChangeEvent, name: T) => {
      if (scrollEnabled) {
        if (!event.nativeEvent?.layout) return
        const { width, x } = event.nativeEvent.layout

        itemLayoutGathering.current.set(name, {
          width,
          x,
        })

        // pick out the layouts for the tabs we know about (in case they changed dynamically)
        const layout = Array.from(itemLayoutGathering.current.entries())
          .filter(([tabName]) => tabNames.includes(tabName))
          .map(([, layout]) => layout)
          .sort((a, b) => a.x - b.x)

        if (layout.length === tabNames.length) {
          setItemsLayout(layout)
        }
      }
    },
    [scrollEnabled, tabNames]
  )

  const cancelNextScrollSync = useSharedValue(index.value)

  const onScroll = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        tabsOffset.value = event.contentOffset.x
      },
      onBeginDrag: () => {
        isScrolling.value = true
        cancelNextScrollSync.value = index.value
      },
      onMomentumEnd: () => {
        isScrolling.value = false
      },
    },
    []
  )

  const currentIndexToSync = useSharedValue(index.value)
  const targetIndexToSync = useSharedValue(index.value)

  useAnimatedReaction(
    () => {
      return index.value
    },
    (nextIndex) => {
      if (scrollEnabled) {
        cancelAnimation(currentIndexToSync)
        targetIndexToSync.value = nextIndex
        currentIndexToSync.value = withTiming(nextIndex)
      }
    },
    [scrollEnabled]
  )

  useAnimatedReaction(
    () => {
      return currentIndexToSync.value === targetIndexToSync.value
    },
    (canSync) => {
      if (
        canSync &&
        scrollEnabled &&
        itemsLayout.length === nTabs &&
        itemsLayout[index.value]
      ) {
        const halfTab = itemsLayout[index.value].width / 2
        const offset = itemsLayout[index.value].x
        if (
          keepActiveTabCentered ||
          offset < tabsOffset.value ||
          offset > tabsOffset.value + width - 2 * halfTab
        ) {
          scrollTo(tabBarRef, offset - width / 2 + halfTab, 0, true)
        }
      }
    },
    [scrollEnabled, itemsLayout, nTabs]
  )

  const stylez = useAnimatedStyle(() => {
    const transform =
      itemsLayout.length > 1
        ? [
          {
            translateX: interpolate(
              indexDecimal.value,
              itemsLayout.map((_, i) => i),
              // when in RTL mode, the X value should be inverted
              [0, ((46 * windowWidth) / 100) + 4]
            ),
          },
        ]
        : undefined

    const width =
      itemsLayout.length > 1
        ? interpolate(
          indexDecimal.value,
          itemsLayout.map((_, i) => i),
          itemsLayout.map((v) => v.width)
        )
        : itemsLayout[0]?.width

    return {
      transform,
      width,
    }
  }, [indexDecimal, itemsLayout])

  return (
    <Animated.ScrollView
      ref={tabBarRef}
      horizontal
      style={style}
      contentContainerStyle={[
        styles.contentContainer,
        !scrollEnabled && { width },
        contentContainerStyle,
        showDefaultTabs && { backgroundColor: '#FFF8EE', marginHorizontal: '0%' }
      ]}
      keyboardShouldPersistTaps="handled"
      bounces={false}
      alwaysBounceHorizontal={false}
      scrollsToTop={false}
      showsHorizontalScrollIndicator={false}
      automaticallyAdjustContentInsets={false}
      overScrollMode="never"
      scrollEnabled={scrollEnabled}
      onScroll={scrollEnabled ? onScroll : undefined}
      scrollEventThrottle={16}
    >
      {
        showDefaultTabs
        &&
        tabNames.map((name, i) => {
          return (
            <TabItemComponent
              key={name}
              index={i}
              name={name}
              label={tabProps.get(name)?.label || getLabelText(name)}
              onPress={onTabPress}
              onLayout={
                scrollEnabled
                  ? (event) => onTabItemLayout(event, name)
                  : undefined
              }
              scrollEnabled={scrollEnabled}
              indexDecimal={indexDecimal}
              labelStyle={labelStyle}
              activeColor={tabProps.get(name)?.activeColor || activeColor}
              inactiveColor={tabProps.get(name)?.inactiveColor || inactiveColor}
              style={[tabStyle, { zIndex: 100 }]}
            />
          )
        })}
      {
        !showDefaultTabs &&
        nTabs > 2
        &&
        <Pressable
          style={{ justifyContent: 'center' }}
          onPress={() => {
            if (indexData?.selected == 0) {
              // setTabs([tabNames[tabNames?.length - 2], tabNames[tabNames?.length - 1]])
              onTabPress(tabNames[tabNames?.length - 1])
              setIndexData({
                selected: tabNames?.length - 1,
                listIndex: tabNames?.length - 2,
              })
              // setIsFirstSelected(false);
            } else if (indexData?.listIndex < indexData?.selected) {
              // setTabs([tabNames[indexData?.listIndex], tabNames[indexData?.selected]])
              onTabPress(tabNames[indexData?.listIndex])
              setIndexData({
                selected: indexData?.listIndex,
                listIndex: indexData?.listIndex + 1,
              })
              // setIsFirstSelected(true);
            } else {
              // setTabs([tabNames[indexData?.selected - 1], tabNames[indexData?.selected]])
              onTabPress(tabNames[indexData?.selected - 1])
              setIndexData({
                selected: indexData?.selected - 1,
                listIndex: indexData?.selected,
              })
              // setIsFirstSelected(true);
            }
          }}
        >
          <Image
            source={require('../assets/next_icon.png')}
            style={{
              alignSelf: 'center',
              height: RF ? RF(25) : 25,
              width: RF ? RF(25) : 25,
              transform: [{ rotate: '180deg' }],
            }}
          />
        </Pressable>
      }
      {
        !showDefaultTabs
        &&
        nTabs == 2
        &&
        <>
          <Animated.View style={[styles.outerTabContainer, RF && { height: RF(44) }]}>
            {
              tabNames?.map((name, i) => {
                return (
                  <TabItemComponent
                    key={name}
                    showCount={showCount}
                    count={showCount && counts[i]}
                    index={i}
                    name={name}
                    label={tabProps.get(name)?.label || getLabelText(name)}
                    onPress={onTabPress}
                    onLayout={
                      scrollEnabled
                        ? (event) => onTabItemLayout(event, name)
                        : undefined
                    }
                    scrollEnabled={scrollEnabled}
                    indexDecimal={indexDecimal}
                    labelStyle={[labelStyle, { color: '#667085' }]}
                  />
                )
              })
            }
          </Animated.View>
          <Animated.View style={[stylez, styles.activeTabContainer, { width: '46%' }, showCount && { flexDirection: 'row' }, RF && { margin: RF(4), height: RF(36), borderRadius: RF(6) }]}>
            <Animated.Text
              style={[labelStyle, styles.activeTabText]}
            >
              {tabNames[index.value]}
            </Animated.Text>
            {
              showCount &&
              <Animated.View style={[styles.countCon, RF && { paddingVertical: RF(2), paddingHorizontal: RF(8), borderRadius: RF(16), marginStart: RF(8) }]}>
                <Animated.Text
                  style={[styles.countText, RFT && { fontSize: RFT(12) }]}
                >
                  {counts[index.value]}
                </Animated.Text>
              </Animated.View>
            }
          </Animated.View>
        </>
      }
      {
        !showDefaultTabs && (nTabs > 2 || nTabs == 1) &&
        <Animated.View style={[styles.outerTabContainer, RF && { height: RF(44) }]}>
          {
            tabNames?.map((tab: any, index: any) => {
              return <MyComponent key={tab} index={index} indexDecimal={indexDecimal} itemsLayout={itemsLayout} tabNames={tabNames} RF={RF} labelStyle={labelStyle} />
            })
          }
        </Animated.View>
      }
      {
        showDefaultTabs
        &&
        itemsLayout.length === nTabs && (
          <Indicator
            indexDecimal={indexDecimal}
            itemsLayout={itemsLayout}
            fadeIn={scrollEnabled}
            style={indicatorStyle}
          />
        )}
    </Animated.ScrollView>
  )
}

const MemoizedTabBar = React.memo(MaterialTabBar)

export { MemoizedTabBar as MaterialTabBar }

const styles = StyleSheet.create({
  contentContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    marginHorizontal: '4%',
    backgroundColor: '#FFFFFF',
  },
  outerTabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '92%',
    height: 44,
    padding: 0,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  activeTabContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  activeTabText: {
    textAlign: 'center',
    alignSelf: 'center',
    color: '#344054',
  },
  countCon: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 16,
    overflow: 'hidden',
    marginStart: 8,
    backgroundColor: '#F2F4F7',
  },
  countText: {
    textAlign: 'center',
    alignSelf: 'center',
    color: '#344054',
    fontWeight: '500',
    fontSize: 12,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    backgroundColor: 'white',
  },
})

const MyComponent = (({ index, indexDecimal, itemsLayout, tabNames, RF, labelStyle }: any) => {

  const style2z = useAnimatedStyle(() => {

    const backgroundColor = interpolateColor(
      indexDecimal.value,
      itemsLayout.map((_: any, i: any) => i),
      ['white', 'white']
    )
    // currentTabName.current = tabNames[Math.floor(indexDecimal.value)]
    // console.log("item layout are: ", itemsLayout, windowWidth);
    // console.log("current tab name: ", currentTabName?.current)


    const transform: any =
      itemsLayout.length > 1
        ? [
          {
            translateX: interpolate(
              indexDecimal.value,
              [0, 1],
              // when in RTL mode, the X value should be inverted
              // [-140 * index, 0]
              [index == 0 ? 0 : (-250 * index) - (35 * index), index == 0 ? 250 + 35 : (-250 * index - (35 * index)) + 250 + 35]
              // [index == 0 ? 0 : (-250 * index) - (35 * index), index == 0 ? 250 + 35 : (-250 * index - (35 * index)) + 250 + 35]
            ),
          },
        ]
        : undefined

    const width =
      itemsLayout.length > 1
        ? interpolate(
          indexDecimal.value,
          itemsLayout.map((_: any, i: any) => i),
          itemsLayout.map((v: any) => v.width)
        )
        : itemsLayout[0]?.width


    return {
      transform,
      width,
      // opacity: 0,
      backgroundColor
    }
  }, [indexDecimal, itemsLayout])

  return (
    <Animated.View style={[style2z, styles.activeTabContainer, { width: '80%' }, {
      shadowColor: '#000',
      shadowOffset: {
        width: RF(0),
        height: RF(1),
      },
      shadowOpacity: RF(0.2),
      shadowRadius: RF(1.41),
      elevation: RF(2),
      backgroundColor: 'white',
    }, RF && { margin: RF(4), height: RF(36), borderRadius: RF(6) }]}
    >
      <Animated.Text style={[labelStyle && labelStyle, styles.activeTabText]}>{tabNames[index]}</Animated.Text>
    </Animated.View>
  );
})
