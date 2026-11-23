import { StyleSheet, View } from 'react-native';

type LogoProps = {
  size?: 'small' | 'medium' | 'large';
};

export function Logo({ size = 'small' }: LogoProps) {
  const isSmall = size === 'small';
  const isLarge = size === 'large';

  const boxSize = isSmall ? 36 : isLarge ? 60 : 44;
  const borderRadius = isSmall ? 11 : isLarge ? 18 : 13;
  const borderWidth = isSmall ? 1.5 : 2;

  return (
    <View
      style={[
        styles.iconWrapper,
        {
          width: boxSize,
          height: boxSize,
          borderRadius,
          borderWidth,
        },
      ]}
    >
      {/* House Roof & Chimney */}
      <View style={styles.roofWrapper}>
        <View style={[styles.chimney, isSmall && styles.chimneySmall]} />
        <View style={[styles.roofPeak, isSmall && styles.roofPeakSmall]} />
      </View>

      {/* Calculator Body */}
      <View style={[styles.calcBody, isSmall && styles.calcBodySmall]}>
        <View style={[styles.calcScreen, isSmall && styles.calcScreenSmall]} />
        <View style={styles.calcKeysRow}>
          <View style={[styles.calcKey, isSmall && styles.calcKeySmall]} />
          <View style={[styles.calcKey, isSmall && styles.calcKeySmall]} />
          <View style={[styles.calcKey, isSmall && styles.calcKeySmall]} />
        </View>
        <View style={styles.calcKeysRow}>
          <View style={[styles.calcKey, isSmall && styles.calcKeySmall]} />
          <View style={[styles.calcKey, isSmall && styles.calcKeySmall]} />
          <View
            style={[
              styles.calcKey,
              styles.calcKeyOrange,
              isSmall && styles.calcKeySmall,
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    backgroundColor: '#0F172A',
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
    position: 'relative',
  },
  roofWrapper: {
    alignItems: 'center',
    marginBottom: 1,
    position: 'relative',
  },
  chimney: {
    position: 'absolute',
    top: -2,
    right: 2.5,
    width: 2.5,
    height: 5,
    backgroundColor: '#EA580C',
    borderRadius: 1,
  },
  chimneySmall: {
    top: -1.5,
    right: 2,
    width: 2,
    height: 4,
  },
  roofPeak: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#F59E0B',
  },
  roofPeakSmall: {
    borderLeftWidth: 8.5,
    borderRightWidth: 8.5,
    borderBottomWidth: 6,
  },
  calcBody: {
    width: 19,
    height: 17,
    borderRadius: 3.5,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    padding: 1.5,
    alignItems: 'center',
  },
  calcBodySmall: {
    width: 16,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.2,
    padding: 1,
  },
  calcScreen: {
    width: '100%',
    height: 3.5,
    backgroundColor: '#F59E0B',
    borderRadius: 1,
    marginBottom: 1.5,
  },
  calcScreenSmall: {
    height: 2.8,
    marginBottom: 1,
  },
  calcKeysRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 1,
  },
  calcKey: {
    width: 2.8,
    height: 2.8,
    borderRadius: 0.8,
    backgroundColor: '#FFFFFF',
  },
  calcKeySmall: {
    width: 2.2,
    height: 2.2,
  },
  calcKeyOrange: {
    backgroundColor: '#EA580C',
  },
});
