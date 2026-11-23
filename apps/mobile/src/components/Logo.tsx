import { StyleSheet, Text, View } from 'react-native';

type LogoProps = {
  size?: 'small' | 'medium' | 'large';
  showSubtitle?: boolean;
};

export function Logo({ size = 'medium', showSubtitle = false }: LogoProps) {
  const isSmall = size === 'small';
  const isLarge = size === 'large';

  const iconBoxSize = isSmall ? 28 : isLarge ? 56 : 38;
  const titleSize = isSmall ? 17 : isLarge ? 26 : 21;

  return (
    <View style={styles.container}>
      {/* Geometric Architectural Icon */}
      <View
        style={[
          styles.iconWrapper,
          { width: iconBoxSize, height: iconBoxSize, borderRadius: isLarge ? 16 : isSmall ? 8 : 11 },
        ]}
      >
        <View style={styles.iconRoofPeak} />
        <View style={styles.iconPillars}>
          <View style={styles.iconPillarBar} />
          <View style={styles.iconPillarCenter} />
          <View style={styles.iconPillarBar} />
        </View>
        <View style={styles.iconBase} />
      </View>

      {/* Typography */}
      <View style={styles.textColumn}>
        <View style={styles.titleRow}>
          <Text style={[styles.titleMain, { fontSize: titleSize }]}>Home</Text>
          <Text style={[styles.titleAccent, { fontSize: titleSize }]}>X</Text>
          <View style={[styles.bdBadge, isSmall && styles.bdBadgeSmall]}>
            <Text style={[styles.bdBadgeText, isSmall && styles.bdBadgeTextSmall]}>BD</Text>
          </View>
        </View>
        {showSubtitle && (
          <Text style={styles.subtitle}>স্মার্ট বাড়ি নির্মাণ ও হিসাব</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  iconWrapper: {
    backgroundColor: '#0F2E20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  iconRoofPeak: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#10B981',
    marginBottom: 1,
  },
  iconPillars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2.5,
    height: 10,
  },
  iconPillarBar: {
    width: 2.5,
    height: 8,
    backgroundColor: '#A7F3D0',
    borderRadius: 1,
  },
  iconPillarCenter: {
    width: 3.5,
    height: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  iconBase: {
    width: 14,
    height: 2,
    backgroundColor: '#10B981',
    marginTop: 1,
    borderRadius: 1,
  },
  textColumn: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleMain: {
    fontWeight: '900',
    color: '#0F2E20',
    letterSpacing: -0.5,
  },
  titleAccent: {
    fontWeight: '900',
    color: '#059669',
    letterSpacing: -0.5,
  },
  bdBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 4.5,
    paddingVertical: 1.5,
    borderRadius: 5,
    marginLeft: 3,
  },
  bdBadgeSmall: {
    paddingHorizontal: 3.5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  bdBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  bdBadgeTextSmall: {
    fontSize: 8.5,
  },
  subtitle: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: -1,
  },
});
