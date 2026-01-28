import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { colors, fonts } from "../theme";

const { width } = Dimensions.get("window");

interface OnboardingSlideProps {
  title: string;
  subtitle: string;
  image: string;
  ImageComponent?: React.ReactNode;
}

const OnboardingSlide: React.FC<OnboardingSlideProps> = ({
  title,
  subtitle,
  ImageComponent,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.imageContainer}>
        {ImageComponent ? (
          ImageComponent
        ) : (
          <View style={styles.placeholderImage} />
        )}
      </View>

      <View style={styles.footerContainer}>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width,
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingVertical: 20,
  },
  headerContainer: {
    alignItems: "flex-start",
    width: "100%",
    paddingTop: 20,
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginTop: 30,
  },
  placeholderImage: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: colors.overlay,
  },
  footerContainer: {
    alignItems: "center",
    paddingBottom: 0,
    marginTop: 40,
  },
  title: {
    fontFamily: fonts.edensor.bold,
    fontSize: 28,
    color: colors.primary,
    textAlign: "left",
  },
  subtitle: {
    fontFamily: fonts.outfit.light,
    fontSize: 20,
    color: colors.primary,
    textAlign: "center",
    lineHeight: 28,
  },
});

export default OnboardingSlide;
