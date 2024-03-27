import React, { useMemo } from 'react'
import { StyleSheet, Pressable, Platform } from 'react-native'
import Animated, {
  useAnimatedStyle,
} from 'react-native-reanimated'

import { TabName } from '../types'
import { MaterialTabItemProps } from './types'

export const TABBAR_HEIGHT = 48
const DEFAULT_COLOR = 'rgba(0, 0, 0, 1)'

/**
 * Any additional props are passed to the pressable component.
 */
export const MaterialTabItem = <T extends TabName = string>(
  props: MaterialTabItemProps<T>
): React.ReactElement => {
  const {
    name,
    index,
    showCount,
    count,
    onPress,
    onLayout,
    scrollEnabled,
    indexDecimal,
    label,
    style,
    labelStyle,
    activeColor = DEFAULT_COLOR,
    inactiveColor = DEFAULT_COLOR,
    inactiveOpacity = 0.7,
    pressColor = '#DDDDDD',
    pressOpacity = Platform.OS === 'ios' ? 0.2 : 1,
    RF,
    RFT,
    ...rest
  } = props

  const stylez = useAnimatedStyle(() => {
    return {

      color:
        Math.abs(index - indexDecimal.value) < 0.5
          ? activeColor
          : inactiveColor,
    }
  })

  const renderedLabel = useMemo(() => {
    if (typeof label === 'string') {
      return (
        showCount ?
          <Animated.View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', }}>
            <Animated.Text style={[styles.label, stylez, labelStyle]}>
              {label}
            </Animated.Text>
            <Animated.View style={[styles.countCon, RF && { paddingVertical: RF(2), paddingHorizontal: RF(8), borderRadius: RF(16), marginStart: RF(8) }]}>
              <Animated.Text style={[styles.countText, RFT && { fontSize: RFT(12) }]}>
                {count}
              </Animated.Text>
            </Animated.View>
          </Animated.View>
          :
          <Animated.Text style={[styles.label, stylez, labelStyle, RF && { margin: RF(4) }]}>
            {label}
          </Animated.Text>
      )
    }

    return label(props)
  }, [label, labelStyle, props, stylez])

  return (
    <Pressable
      onLayout={onLayout}
      style={() => [
        // { opacity: pressed ? pressOpacity : 1 },
        !scrollEnabled && styles.grow,
        styles.item,
        style,
      ]}
      onPress={() => onPress(name)}
      {...rest}
    >
      {renderedLabel}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  grow: {
    flex: 1,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    height: TABBAR_HEIGHT,
  },
  label: {
    margin: 4,
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
})
