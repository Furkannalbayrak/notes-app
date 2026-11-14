import React, { useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Platform,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StrokeData } from '../utils/blocks';
import { fonts, useTheme } from '../theme';

interface Props {
  visible: boolean;
  initialStrokes?: StrokeData[];
  onSave: (strokes: StrokeData[], canvasWidth: number, canvasHeight: number) => void;
  onClose: () => void;
}

const COLORS = [
  '#1C1C1E',
  '#E53935',
  '#FFB300',
  '#43A047',
  '#1E88E5',
  '#8E24AA',
  '#FB8C00',
];

const WIDTHS = [3, 6, 11];

export function DrawingModal({ visible, initialStrokes, onSave, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [strokes, setStrokes] = useState<StrokeData[]>(initialStrokes ?? []);
  const [redoStack, setRedoStack] = useState<StrokeData[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [color, setColor] = useState<string>(COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState<number>(WIDTHS[1]);
  const [canvasSize, setCanvasSize] = useState({ w: width, h: height - 160 });

  const colorRef = useRef(color);
  const widthRef = useRef(strokeWidth);
  const pathRef = useRef('');
  colorRef.current = color;
  widthRef.current = strokeWidth;

  React.useEffect(() => {
    if (visible) {
      setStrokes(initialStrokes ?? []);
      setRedoStack([]);
      setCurrentPath('');
    }
  }, [visible, initialStrokes]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const p = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        pathRef.current = p;
        setCurrentPath(p);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const p = `${pathRef.current} L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        pathRef.current = p;
        setCurrentPath(p);
      },
      onPanResponderRelease: () => {
        const finalD = pathRef.current;
        if (finalD) {
          setStrokes((prev) => [
            ...prev,
            { color: colorRef.current, width: widthRef.current, d: finalD },
          ]);
          setRedoStack([]);
          pathRef.current = '';
          setCurrentPath('');
        }
      },
    }),
  ).current;

  const undo = () => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, last]);
      return prev.slice(0, -1);
    });
  };

  const redo = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setStrokes((s) => [...s, last]);
      return prev.slice(0, -1);
    });
  };

  const clearAll = () => {
    setStrokes([]);
    setRedoStack([]);
    setCurrentPath('');
  };

  const handleDone = () => {
    if (strokes.length === 0) {
      onClose();
      return;
    }
    onSave(strokes, canvasSize.w, canvasSize.h);
  };

  const topPad = Math.max(
    insets.top,
    Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 28) + 8 : 44,
    36,
  );
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'android' ? 28 : 16);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.container, { paddingTop: topPad }]}>
        {/* Üst Bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="close" size={27} color="#1C1C1E" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <TouchableOpacity
              onPress={undo}
              disabled={strokes.length === 0}
              hitSlop={8}
              style={styles.iconBtn}
            >
              <Ionicons
                name="arrow-undo"
                size={23}
                color={strokes.length > 0 ? '#1C1C1E' : '#C7C7CC'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={redo}
              disabled={redoStack.length === 0}
              hitSlop={8}
              style={styles.iconBtn}
            >
              <Ionicons
                name="arrow-redo"
                size={23}
                color={redoStack.length > 0 ? '#1C1C1E' : '#C7C7CC'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={clearAll}
              disabled={strokes.length === 0}
              hitSlop={8}
              style={styles.iconBtn}
            >
              <MaterialCommunityIcons
                name="eraser"
                size={23}
                color={strokes.length > 0 ? '#E53935' : '#C7C7CC'}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleDone} hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="checkmark" size={29} color="#F5A623" />
          </TouchableOpacity>
        </View>

        {/* Beyaz Çizim Tuvali */}
        <View
          style={styles.canvas}
          onLayout={(e) => {
            const { width: w, height: h } = e.nativeEvent.layout;
            if (w > 0 && h > 0) setCanvasSize({ w, h });
          }}
          {...panResponder.panHandlers}
        >
          { strokes.length === 0 && !currentPath && (
            <View pointerEvents="none" style={styles.hintWrap}>
              <Text style={[styles.hintText, { fontFamily: theme.fonts.regular }]}>Parmağınızla buraya çizin</Text>
            </View>
          )}
          <Svg style={StyleSheet.absoluteFill}>
            {strokes.map((s, idx) => (
              <Path
                key={idx}
                d={s.d}
                stroke={s.color}
                strokeWidth={s.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {currentPath !== '' && (
              <Path
                d={currentPath}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </Svg>
        </View>

        {/* Alt Renk ve Kalınlık Seçim Paneli */}
        <View style={[styles.paletteBar, { paddingBottom: bottomPad }]}>
          <View style={styles.widthRow}>
            {WIDTHS.map((w) => {
              const active = strokeWidth === w;
              return (
                <TouchableOpacity
                  key={w}
                  onPress={() => setStrokeWidth(w)}
                  style={[styles.widthBtn, active && styles.widthBtnActive]}
                >
                  <View
                    style={{
                      width: w + 4,
                      height: w + 4,
                      borderRadius: (w + 4) / 2,
                      backgroundColor: color,
                    }}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.colorRow}>
            {COLORS.map((c) => {
              const selected = color === c;
              return (
                <TouchableOpacity
                  key={c}
                  activeOpacity={0.8}
                  onPress={() => setColor(c)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    selected && styles.colorSelected,
                  ]}
                >
                  {selected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  hintWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: '#C7C7CC',
  },
  paletteBar: {
    backgroundColor: '#F7F7FA',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    paddingTop: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  widthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  widthBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAEAEF',
  },
  widthBtnActive: {
    borderWidth: 2,
    borderColor: '#F5A623',
    backgroundColor: '#FFFFFF',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  colorCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSelected: {
    transform: [{ scale: 1.15 }],
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
