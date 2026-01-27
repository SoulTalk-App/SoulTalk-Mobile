import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
} from "react-native";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import OnboardingSlide from "../components/OnboardingSlide";
import LayeredCarouselImage from "../components/LayeredCarouselImage";
import { onboardingSlides } from "../mocks/content";
import { colors, typography } from "../theme";

// PNG imports
const Carousel1 = require("../../assets/images/onboarding/Carousel1.png");
const Carousel3 = require("../../assets/images/onboarding/Carousel3.png");
const SoultalkLogo = require("../../assets/images/logo/SoultalkLogo.png");

const { width, height } = Dimensions.get("window");

interface OnboardingScreenProps {
  navigation: any;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const carouselRef = useRef<ICarouselInstance>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isFirstSlide = activeIndex === 0;
  const isLastSlide = activeIndex === onboardingSlides.length - 1;

  const handleSkip = () => {
    navigation.navigate("Terms");
  };

  const handleDotPress = (index: number) => {
    carouselRef.current?.scrollTo({ index, animated: true });
  };

  const handlePrev = () => {
    if (!isFirstSlide) {
      carouselRef.current?.prev();
    }
  };

  const handleNextSlide = () => {
    if (isLastSlide) {
      navigation.navigate("Terms");
    } else {
      carouselRef.current?.next();
    }
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        <TouchableOpacity
          onPress={handlePrev}
          style={[styles.arrowButton, isFirstSlide && styles.arrowDisabled]}
          disabled={isFirstSlide}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={isFirstSlide ? colors.text.secondary : colors.primary}
          />
        </TouchableOpacity>

        <View style={styles.dotsWrapper}>
          {onboardingSlides.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleDotPress(index)}
              style={styles.dotTouchable}
            >
              <View
                style={[
                  styles.dot,
                  index === activeIndex ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleNextSlide}
          style={styles.arrowButton}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Image
          source={SoultalkLogo}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        {!isLastSlide ? (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>

      <View style={styles.carouselContainer}>
        <Carousel
          ref={carouselRef}
          width={width}
          height={height * 0.65}
          data={onboardingSlides}
          onSnapToItem={(index) => setActiveIndex(index)}
          renderItem={({ item, index }) => {
            const isActive = index === activeIndex;
            const scale = isActive ? 1.05 : 1;

            let ImageContent: React.ReactNode = null;

            if (index === 0) {
              ImageContent = (
                <Image
                  source={Carousel1}
                  style={{ width: 300, height: 300 }}
                  resizeMode="contain"
                />
              );
            } else if (index === 1) {
              ImageContent = <LayeredCarouselImage />;
            } else if (index === 2) {
              ImageContent = (
                <Image
                  source={Carousel3}
                  style={{ width: 300, height: 300 }}
                  resizeMode="contain"
                />
              );
            }

            const ImageComponent = (
              <View
                style={{
                  transform: [{ scale }],
                }}
              >
                {ImageContent}
              </View>
            );

            return (
              <OnboardingSlide
                title={item.title}
                subtitle={item.subtitle}
                image={item.image}
                ImageComponent={ImageComponent}
              />
            );
          }}
        />
      </View>

      {renderDots()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    height: 50,
  },
  headerLogo: {
    width: 100,
    height: 22,
  },
  skipText: {
    ...typography.body,
    color: colors.primary,
  },
  skipPlaceholder: {
    width: 40,
  },
  carouselContainer: {
    flex: 1,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  arrowButton: {
    padding: 8,
  },
  arrowDisabled: {
    opacity: 0.4,
  },
  dotsWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
  },
  dotTouchable: {
    padding: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activeDot: {
    backgroundColor: colors.primary,
    width: 24,
  },
  inactiveDot: {
    backgroundColor: colors.border,
  },
});

export default OnboardingScreen;
