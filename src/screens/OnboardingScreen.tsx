import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { SafeAreaView } from "react-native-safe-area-context";
import OnboardingSlide from "../components/OnboardingSlide";
import { onboardingSlides } from "../mocks/content";
import { colors, typography } from "../theme";

const { width, height } = Dimensions.get("window");

interface OnboardingScreenProps {
  navigation: any;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const carouselRef = useRef<ICarouselInstance>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLastSlide = activeIndex === onboardingSlides.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      navigation.navigate("Terms");
    } else {
      carouselRef.current?.next();
    }
  };

  const handleSkip = () => {
    navigation.navigate("Terms");
  };

  const handleDotPress = (index: number) => {
    carouselRef.current?.scrollTo({ index, animated: true });
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
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
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.skipContainer}>
        {!isLastSlide && (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.carouselContainer}>
        <Carousel
          ref={carouselRef}
          width={width}
          height={height * 0.65}
          data={onboardingSlides}
          onSnapToItem={(index) => setActiveIndex(index)}
          renderItem={({ item }) => (
            <OnboardingSlide
              title={item.title}
              subtitle={item.subtitle}
              image={item.image}
            />
          )}
        />
      </View>

      {renderDots()}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {isLastSlide ? "Continue" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipContainer: {
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 10,
    height: 44,
  },
  skipText: {
    ...typography.body,
    color: colors.primary,
  },
  carouselContainer: {
    flex: 1,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
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
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  nextButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonText: {
    ...typography.button,
    color: colors.white,
  },
});

export default OnboardingScreen;
