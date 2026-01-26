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
    width: 220,
    height: 300,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  sideImageLeft: {
    position: "absolute",
    left: -25,
    width: 120,
    height: 220,
    zIndex: 1,
  },
  centerImage: {
    position: "absolute",
    width: 170,
    height: 270,
    zIndex: 2,
  },
  sideImageRight: {
    position: "absolute",
    right: -25,
    width: 120,
    height: 220,
    zIndex: 1,
  },
});

export default LayeredCarouselImage;
