#!/bin/bash
set -e

# SoulTalk iOS Deployment Script
# Usage: ./scripts/deploy-ios.sh

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$PROJECT_DIR/build"
EXPORT_PLIST="$PROJECT_DIR/ios/ExportOptions.plist"
ARCHIVE_PATH="$BUILD_DIR/SoulTalk.xcarchive"
IPA_DIR="$BUILD_DIR/SoulTalkIPA"

# Signing
TEAM_ID="7ZL49383C4"
SIGN_IDENTITY="Apple Distribution: SoulTalk Inc ($TEAM_ID)"
PROFILE_NAME="devProfile"
BUNDLE_ID="com.soultalk.mobile"

# App Store Connect
APPLE_ID="dev@soultalkapp.com"

# Production API — exported so Metro picks it up during xcodebuild JS bundling
export API_BASE_URL="https://soultalkapp.com/api"

echo "=== SoulTalk iOS Deploy ==="

# Clean previous build
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Ensure ExportOptions.plist exists (expo prebuild --clean wipes it)
if [ ! -f "$EXPORT_PLIST" ]; then
  echo "-> Recreating ExportOptions.plist"
  cat > "$EXPORT_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>app-store-connect</string>
	<key>teamID</key>
	<string>$TEAM_ID</string>
	<key>signingStyle</key>
	<string>manual</string>
	<key>provisioningProfiles</key>
	<dict>
		<key>$BUNDLE_ID</key>
		<string>$PROFILE_NAME</string>
	</dict>
</dict>
</plist>
PLIST
fi

# Step 1: Expo prebuild with production API URL
echo "-> Prebuild with API_BASE_URL=$API_BASE_URL"
cd "$PROJECT_DIR"
npx expo prebuild --clean

# Recreate ExportOptions.plist after prebuild --clean
echo "-> Recreating ExportOptions.plist after prebuild"
cat > "$EXPORT_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>app-store-connect</string>
	<key>teamID</key>
	<string>$TEAM_ID</string>
	<key>signingStyle</key>
	<string>manual</string>
	<key>provisioningProfiles</key>
	<dict>
		<key>$BUNDLE_ID</key>
		<string>$PROFILE_NAME</string>
	</dict>
</dict>
</plist>
PLIST

# Auto-detect workspace and scheme after prebuild
WORKSPACE="$(find "$PROJECT_DIR/ios" -name '*.xcworkspace' -maxdepth 1 | head -1)"
SCHEME="$(basename "$WORKSPACE" .xcworkspace)"
echo "-> Detected workspace: $WORKSPACE (scheme: $SCHEME)"

# Step 2: Archive
echo "-> Archiving..."
xcodebuild -workspace "$WORKSPACE" -scheme "$SCHEME" -configuration Release -destination generic/platform=iOS -archivePath "$ARCHIVE_PATH" archive CODE_SIGN_IDENTITY="$SIGN_IDENTITY" CODE_SIGN_STYLE=Manual PROVISIONING_PROFILE_SPECIFIER="$PROFILE_NAME"

echo "-> Archive succeeded"

# Step 3: Export IPA
echo "-> Exporting IPA..."
xcodebuild -exportArchive -archivePath "$ARCHIVE_PATH" -exportOptionsPlist "$EXPORT_PLIST" -exportPath "$IPA_DIR"

echo "-> Export succeeded"

# Step 4: Upload to TestFlight
IPA_FILE="$(find "$IPA_DIR" -name '*.ipa' | head -1)"
if [ ! -f "$IPA_FILE" ]; then
  echo "ERROR: IPA not found at $IPA_FILE"
  exit 1
fi

echo "-> Uploading to TestFlight..."
xcrun altool --upload-app -f "$IPA_FILE" -t ios -u "$APPLE_ID" -p "jpkj-xmew-amdn-baie"

echo "=== Deploy complete! Build will appear in TestFlight after Apple processing. ==="
