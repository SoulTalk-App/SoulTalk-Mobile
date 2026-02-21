import React from 'react';
import SoulTalkLoader from '../components/SoulTalkLoader';

interface TransitionSplashScreenProps {
  navigation: any;
}

const TransitionSplashScreen: React.FC<TransitionSplashScreenProps> = ({ navigation }) => {
  return (
    <SoulTalkLoader
      loop={false}
      onComplete={() => navigation.replace('WelcomeSplash')}
    />
  );
};

export default TransitionSplashScreen;
