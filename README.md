# Fieldframe

**Wireless mobile photography for Google Sheets.**

Fieldframe is an open-source, Google Apps Script-based application that allows users to capture photographs from a smartphone and insert them directly into selected Google Sheets cells.

It is designed for site inspections, construction documentation, field surveys, property assessments, and other workflows that require photographs to be recorded alongside structured spreadsheet data.

Fieldframe runs within the Google Workspace ecosystem using Google Sheets, Google Drive, and Apps Script. No external server or third-party hosting is required.

## Get Started

**[Create your own Fieldframe spreadsheet](https://docs.google.com/spreadsheets/d/1bvV0MiGuvt216H870_CBKpRIjtGjZq5Z694eKtbWcMQ/copy)**

The template includes the application source code. Users only need to create a copy, authorize the required Google permissions, and deploy their own web app.

No programming knowledge is required.

## Features

| Feature | Description |
|---|---|
| Wireless photography | Capture and upload photographs directly from a smartphone browser. |
| Automatic cell detection | Detect the currently selected Google Sheets cell. |
| Manual mode | Insert a photograph into a manually selected destination. |
| Auto Down | Continue inserting photographs vertically across available cells. |
| Auto Right | Continue inserting photographs horizontally across available cells. |
| Occupied-cell protection | Prevent existing spreadsheet content from being overwritten. |
| Original-quality storage | Preserve original uploaded image bytes in Google Drive. |
| In-cell image insertion | Display photographs directly inside spreadsheet cells. |
| Multiple worksheet support | Switch between worksheet tabs without additional deployments. |
| Automatic folder management | Organize images by spreadsheet and worksheet names. |
| Folder recovery | Recreate missing or deleted storage folders when required. |

## Installation

### 1. Create a spreadsheet

Open the [Fieldframe template](https://docs.google.com/spreadsheets/d/1bvV0MiGuvt216H870_CBKpRIjtGjZq5Z694eKtbWcMQ/copy).

Sign in with your Google account and select **Make a copy**.

The copied spreadsheet contains the complete Fieldframe application, including `Code.gs` and `Camera.html`.

You may rename the spreadsheet and its worksheet tabs according to your project requirements.

### 2. Open Apps Script

From your copied spreadsheet, navigate to:

**Extensions → Apps Script**

The Apps Script editor opens in a new browser tab.

No source-code modifications are required.

### 3. Deploy the web application

In the Apps Script editor:

1. Select **Deploy → New deployment**.
2. Under **Select type**, choose **Web app**.
3. Configure the deployment as follows:

| Setting | Value |
|---|---|
| Description | Fieldframe |
| Execute as | Me |
| Who has access | Only myself |

4. Select **Deploy**.
5. Review and authorize the requested Google account permissions.

Google may display an unverified application warning for a user-deployed Apps Script project. Review the permissions and source code before proceeding.

### 4. Connect your smartphone

After deployment, copy the generated **Web app URL**.

Open the URL in your smartphone browser using the Google account authorized for the deployment.

Grant camera access when prompted.

Fieldframe is now ready to use.

## Usage

### Manual Mode

1. Open your Fieldframe spreadsheet on a computer.
2. Select an empty destination cell.
3. Open the Fieldframe web application on your smartphone.
4. Confirm that the destination cell has been detected.
5. Capture and upload a photograph.

Fieldframe inserts the photograph into the selected cell and saves the associated image files in Google Drive.

To capture another photograph, select the next destination cell.

### Auto Down

Auto Down advances the destination vertically.

For example:

`D5 → D6 → D7 → D8`

Fieldframe checks subsequent cells and skips occupied destinations.

### Auto Right

Auto Right advances the destination horizontally.

For example:

`D5 → E5 → F5 → G5`

Selecting another cell on the computer overrides the current automatic destination.

### Multiple Worksheets

Fieldframe supports multiple worksheet tabs within the same spreadsheet.

To use another worksheet:

1. Create or open a worksheet tab.
2. Select the destination cell.
3. Continue capturing photographs.

Fieldframe identifies the worksheet and automatically manages its corresponding Google Drive folders.

A separate deployment is not required for additional tabs within the same spreadsheet.

A completely new spreadsheet requires a new copy of the Fieldframe template and its own web app deployment.

## Google Drive Organization

Fieldframe organizes uploaded photographs according to the spreadsheet and worksheet names.

For example, a spreadsheet named `Site Inspection` containing two worksheets produces the following structure:

```text
Site Inspection/
|
+-- Building A/
|   |
|   +-- Building A-private/
|   +-- Building A-public/
|
+-- Building B/
    |
    +-- Building B-private/
    +-- Building B-public/
```

**Private folders** contain the original uploaded photographs.

**Public folders** contain display copies used for inserting images into Google Sheets. These individual files are configured for viewing by anyone with their links.

Folders are created automatically when the first photograph is uploaded to a worksheet.

If a spreadsheet or worksheet is renamed, Fieldframe updates the corresponding folder names during a subsequent upload.

If a tracked folder becomes unavailable or is moved to Trash, Fieldframe creates a replacement. Previously deleted photographs are not recovered.

## Architecture

Fieldframe uses a spreadsheet-bound Google Apps Script project.

| Component | Responsibility |
|---|---|
| Google Sheets | Spreadsheet interface and destination-cell selection |
| Apps Script | Selection tracking, upload validation, image insertion, and Drive management |
| HTML Service | Mobile camera web interface |
| Google Drive | Original image storage and display-image storage |
| Script Properties | Selection state and folder identification |
| Lock Service | Coordination of concurrent upload operations |

The application consists of two primary source files:

```text
fieldframe/
|
+-- Code.gs
+-- Camera.html
+-- README.md
+-- LICENSE
```

`Code.gs` implements the backend logic, Google Sheets integration, upload processing, and Google Drive operations.

`Camera.html` implements the mobile camera interface and communicates with the Apps Script backend.

## Security and Privacy

Fieldframe operates using the Google account that authorizes and deploys the application.

The application requires access to Google Sheets and Google Drive to perform its core functions.

Original photographs are stored in private Drive folders by default.

Display copies are configured with link-based viewing permissions to support in-cell image rendering. Anyone possessing a valid display-file link may be able to access the corresponding photograph.

Users should avoid uploading confidential or sensitive photographs unless this access model meets their requirements.

Fieldframe does not require users to provide their Google account passwords or API keys to the application.

The current implementation maintains selection state at the script level and is primarily intended for a single active operator per deployed spreadsheet. Independent simultaneous multi-user operation is not guaranteed.

## Troubleshooting

| Issue | Recommended action |
|---|---|
| Destination cell not detected | Select a cell again in Google Sheets and wait for Fieldframe to update. |
| Selection expired | Reselect the destination cell before uploading. |
| Cell already occupied | Select an empty cell or use an automatic mode. |
| Camera permission denied | Enable camera permissions for the browser and reload Fieldframe. |
| Upload authorization error | Verify the Google account used for deployment and review its permissions. |
| Web app not accessible | Confirm the deployment access settings and use the latest deployment URL. |
| Images not appearing | Check the upload result, Drive permissions, and destination cell. |
| New spreadsheet not connected | Create a copy of the Fieldframe template and deploy that copy separately. |

## Technical Requirements

- A Google account with access to Google Sheets, Google Drive, and Apps Script.
- A desktop or laptop browser for spreadsheet interaction.
- A smartphone with a supported camera and modern web browser.
- An internet connection on both devices.
- Permission to authorize the required Google Workspace services.

## Limitations

- Each independently copied spreadsheet requires its own web app deployment.
- The application is designed primarily for a single active operator.
- Uploads are subject to Google Apps Script execution limits and Google Drive quotas.
- Supported upload formats are JPEG, PNG, and WebP, with a maximum photo size of 20 MB.
- Display images use link-viewable Drive files.
- Permanently deleted photographs cannot be restored by Fieldframe.

## License

Fieldframe is distributed under the MIT License. See [LICENSE](LICENSE) for details.
