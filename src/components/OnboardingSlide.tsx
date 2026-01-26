import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { colors, typography } from "../theme";

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
      <View style={styles.imageContainer}>
        {ImageComponent ? (
          ImageComponent
        ) : (
          <View style={styles.placeholderImage} />
        )}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
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
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  imageContainer: {
    flex: 0.6,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  placeholderImage: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: colors.overlay,
  },
  textContainer: {
    flex: 0.4,
    alignItems: "center",
    paddingTop: 40,
  },
  title: {
    ...typography.heading,
    color: colors.primary,
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.light,
    textAlign: "center",
    lineHeight: 24,
  },
});

export default OnboardingSlide;
