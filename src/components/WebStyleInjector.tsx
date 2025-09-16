import { Platform } from 'react-native';
import { useEffect } from 'react';

const WebStyleInjector = () => {
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Just set autocomplete attributes without clearing values
      setTimeout(() => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');
        inputs.forEach((input: any) => {
          input.setAttribute('autocomplete', 'new-password');
          input.setAttribute('autocomplete', 'off');
          input.setAttribute('data-form-type', 'other');
        });
      }, 100);

      // Create a style element
      const style = document.createElement('style');
      style.id = 'input-override-styles';
      
      // Add our CSS
      style.textContent = `
        /* Nuclear option - force override everything */
        input, textarea, select {
          background: #3D3D3D !important;
          background-color: #3D3D3D !important;
          background-image: none !important;
          color: #FFFFFF !important;
          border: none !important;
          outline: none !important;
          box-shadow: inset 0 0 0 1000px #3D3D3D !important;
          -webkit-box-shadow: inset 0 0 0 1000px #3D3D3D !important;
          -moz-box-shadow: inset 0 0 0 1000px #3D3D3D !important;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
          -webkit-text-fill-color: #FFFFFF !important;
          caret-color: #FFFFFF !important;
          font-family: inherit !important;
        }

        /* All interactive states */
        input:focus, input:active, input:hover,
        textarea:focus, textarea:active, textarea:hover,
        select:focus, select:active, select:hover {
          background: #3D3D3D !important;
          background-color: #3D3D3D !important;
          background-image: none !important;
          color: #FFFFFF !important;
          border: none !important;
          outline: none !important;
          box-shadow: inset 0 0 0 1000px #3D3D3D !important;
          -webkit-box-shadow: inset 0 0 0 1000px #3D3D3D !important;
          -moz-box-shadow: inset 0 0 0 1000px #3D3D3D !important;
          -webkit-text-fill-color: #FFFFFF !important;
        }

        input[type="text"]::placeholder, 
        input[type="email"]::placeholder, 
        input[type="password"]::placeholder, 
        textarea::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
          opacity: 0.5 !important;
        }

        /* Ultra aggressive autofill override */
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active,
        input:-webkit-autofill:valid {
          -webkit-box-shadow: inset 0 0 0 1000px #3D3D3D !important;
          -webkit-text-fill-color: #FFFFFF !important;
          background-color: #3D3D3D !important;
          background: #3D3D3D !important;
          transition: background-color 5000s ease-in-out 0s !important;
          transition: background 5000s ease-in-out 0s !important;
          caret-color: #FFFFFF !important;
          color: #FFFFFF !important;
        }

        /* Additional aggressive overrides for all states */
        input[type="text"],
        input[type="email"], 
        input[type="password"] {
          background: #3D3D3D !important;
          background-color: #3D3D3D !important;
          background-image: none !important;
          -webkit-box-shadow: inset 0 0 0 50px #3D3D3D !important;
          box-shadow: inset 0 0 0 50px #3D3D3D !important;
        }

        /* Force override on value change */
        input[type="text"][value],
        input[type="email"][value],
        input[type="password"][value] {
          background: #3D3D3D !important;
          background-color: #3D3D3D !important;
          -webkit-box-shadow: inset 0 0 0 50px #3D3D3D !important;
          box-shadow: inset 0 0 0 50px #3D3D3D !important;
          color: #FFFFFF !important;
          -webkit-text-fill-color: #FFFFFF !important;
        }
      `;
      
      // Append to head
      document.head.appendChild(style);

      // Cleanup function
      return () => {
        const existingStyle = document.getElementById('input-override-styles');
        if (existingStyle) {
          document.head.removeChild(existingStyle);
        }
      };
    }
  }, []);

  return null; // This component doesn't render anything
};

export default WebStyleInjector;