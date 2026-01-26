import React from "react";
import { View, Image, StyleSheet } from "react-native";

const Carousel2a = require("../../assets/images/onboarding/Carousel2a.png");
const Carousel2b = require("../../assets/images/onboarding/Carousel2b.png");
const Carousel2c = require("../../assets/images/onboarding/Carousel2c.png");

const LayeredCarouselImage: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Left image (a) - behind */}
      <Image source={Carousel2a} style={styles.sideImageLeft} resizeMode="contain" />

      {/* Center image (b) - in front */}
      <Image source={Carousel2b} style={styles.centerImage} resizeMode="contain" />

      {/* Right image (c) - behind */}
      <Image source={Carousel2c} style={styles.sideImageRight} resizeMode="contain" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 250,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  sideImageLeft: {
    position: "absolute",
    left: 10,
    width: 100,
    height: 180,
    zIndex: 1,
  },
  centerImage: {
    position: "absolute",
    width: 140,
    height: 220,
    zIndex: 2,
  },
  sideImageRight: {
    position: "absolute",
    right: 10,
    width: 100,
    height: 180,
    zIndex: 1,
  },
});

export default LayeredCarouselImage;
