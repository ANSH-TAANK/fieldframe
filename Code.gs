
/**
 * FIELDFRAME — WIRELESS CAMERA → GOOGLE SHEETS
 * Version 1.7
 *
 * Manual: use the laptop-selected cell for each photo.
 * Auto Down: D5 → D6 → D7 ...
 * Auto Right: D5 → E5 → F5 ...
 *
 * New laptop selections override the Auto destination.
 * Existing cell contents are never intentionally overwritten.
 *
 * Google Drive structure:
 *
 * Spreadsheet Name/
 *   Worksheet Name/
 *     Worksheet Name-private/
 *     Worksheet Name-public/
 *
 * Private: full-quality original images.
 * Public: display copies shared with anyone with the link.
 *
 * Folders are created on the first upload.
 * New worksheet tabs automatically get their own folders.
 * Folder names follow spreadsheet and worksheet renames.
 * Deleted or trashed folders are recreated when needed.
 */

const MAX_PHOTO_SIZE = 20 * 1024 * 1024;
const SELECTION_TIMEOUT = 120000;
const PHOTO_WIDTH = 350;
const PHOTO_HEIGHT = 400;
const MAX_SKIP_SCAN = 5000;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

// ========================================
// 1. TRACK LAPTOP SELECTION
// ========================================

function onSelectionChange(e) {
  if (!e || !e.range) return;

  const range = e.range;

  if (
    range.getNumRows() !== 1 ||
    range.getNumColumns() !== 1
  ) {
    return;
  }

  PropertiesService.getScriptProperties()
    .setProperties({
      selectedSheetId: String(
        range.getSheet().getSheetId()
      ),
      selectedCell: range.getA1Notation(),
      selectedAt: String(Date.now())
    });
}

// ========================================
// 2. MOBILE CAMERA WEBPAGE
// ========================================

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile("Camera")
    .setTitle("Fieldframe");
}

// ========================================
// 3. GET CURRENT LAPTOP SELECTION
// ========================================

function getSelectedCell() {
  const properties =
    PropertiesService.getScriptProperties();

  const cell =
    properties.getProperty("selectedCell");

  const sheetId =
    properties.getProperty("selectedSheetId");

  const selectedAt = Number(
    properties.getProperty("selectedAt")
  );

  if (!cell || !sheetId || !selectedAt) {
    return {
      success: false,
      message: "Select a cell in Google Sheets."
    };
  }

  const expired =
    Date.now() - selectedAt > SELECTION_TIMEOUT;

  return {
    success: true,
    cell: cell,
    sheetId: sheetId,
    selectedAt: selectedAt,
    expired: expired,
    message: expired
      ? "Select the destination cell again."
      : "Destination ready."
  };
}

// ========================================
// 4. GOOGLE DRIVE FOLDER MANAGEMENT
// ========================================

/**
 * Return a tracked folder or create a replacement.
 *
 * The folder ID is stored in Script Properties.
 * Renaming a folder does not change its ID.
 *
 * If the folder is deleted or trashed,
 * a replacement is created.
 *
 * If the folder was moved, it is restored
 * under the expected parent folder.
 */

function getOrCreateFieldframeFolder(
  parent,
  name,
  propertyKey
) {
  const properties =
    PropertiesService.getScriptProperties();

  const existingId =
    properties.getProperty(propertyKey);

  if (existingId) {
    let folder = null;

    try {
      folder = DriveApp.getFolderById(existingId);
    } catch (error) {
      console.log(
        "Tracked folder unavailable: " +
        error.message
      );
    }

    if (folder && !folder.isTrashed()) {
      if (folder.getName() !== name) {
        folder.setName(name);
      }

      const parents = folder.getParents();
      let inExpectedParent = false;

      while (parents.hasNext()) {
        const currentParent = parents.next();

        if (
          currentParent.getId() === parent.getId()
        ) {
          inExpectedParent = true;
          break;
        }
      }

      if (!inExpectedParent) {
        folder.moveTo(parent);
      }

      return folder;
    }
  }

  const newFolder = parent.createFolder(name);

  properties.setProperty(
    propertyKey,
    newFolder.getId()
  );

  console.log(
    "Fieldframe folder created: " +
    newFolder.getName() +
    " | " +
    newFolder.getId()
  );

  return newFolder;
}

/**
 * Get the main Drive folder.
 *
 * Its name matches the spreadsheet file name.
 *
 * Example:
 * Site Inspection/
 *
 * The spreadsheet ID is used to track the folder.
 */

function getFieldframeRootFolder(spreadsheet) {
  const properties =
    PropertiesService.getScriptProperties();

  const spreadsheetId = spreadsheet.getId();

  const propertyKey =
    "FF_ROOT_" + spreadsheetId;

  const existingId =
    properties.getProperty(propertyKey);

  const expectedName = spreadsheet.getName();

  if (existingId) {
    let folder = null;

    try {
      folder = DriveApp.getFolderById(existingId);
    } catch (error) {
      console.log(
        "Root folder unavailable: " +
        error.message
      );
    }

    if (folder && !folder.isTrashed()) {
      if (folder.getName() !== expectedName) {
        folder.setName(expectedName);
      }

      return folder;
    }
  }

  const rootFolder =
    DriveApp.createFolder(expectedName);

  properties.setProperty(
    propertyKey,
    rootFolder.getId()
  );

  console.log(
    "Fieldframe root created: " +
    rootFolder.getName()
  );

  return rootFolder;
}

/**
 * Get the folders for the selected worksheet.
 *
 * Example:
 *
 * Site Inspection/
 *   Site A/
 *     Site A-private/
 *     Site A-public/
 *
 * Each worksheet is tracked using its sheet ID.
 *
 * Switching worksheets switches folders.
 * Renaming worksheets renames folders.
 * Adding worksheets creates new folders
 * on the first upload.
 */

function getFieldframeFolders(sheet) {
  const spreadsheet = sheet.getParent();

  const spreadsheetId = spreadsheet.getId();
  const sheetId = String(sheet.getSheetId());

  const sheetName = sheet.getName();

  const rootFolder =
    getFieldframeRootFolder(spreadsheet);

  const prefix =
    "FF_" + spreadsheetId + "_" + sheetId;

  const worksheetFolder =
    getOrCreateFieldframeFolder(
      rootFolder,
      sheetName,
      prefix + "_TAB"
    );

  const privateFolder =
    getOrCreateFieldframeFolder(
      worksheetFolder,
      sheetName + "-private",
      prefix + "_PRIVATE"
    );

  const publicFolder =
    getOrCreateFieldframeFolder(
      worksheetFolder,
      sheetName + "-public",
      prefix + "_PUBLIC"
    );

  return {
    rootFolder: rootFolder,
    worksheetFolder: worksheetFolder,
    privateFolder: privateFolder,
    publicFolder: publicFolder
  };
}

// ========================================
// 5. GET WORKSHEET BY ID
// ========================================

function getWorksheetById(sheetId) {
  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error(
      "Google Spreadsheet was not found."
    );
  }

  const sheet = spreadsheet
    .getSheets()
    .find(function(item) {
      return String(item.getSheetId()) ===
        String(sheetId);
    });

  if (!sheet) {
    throw new Error(
      "Selected worksheet was not found."
    );
  }

  return sheet;
}

// ========================================
// 6. VALIDATE DESTINATION
// ========================================

function getValidTarget(sheet, cell) {
  if (
    typeof cell !== "string" ||
    !/^[A-Z]+[1-9][0-9]*$/i.test(cell)
  ) {
    throw new Error("Invalid destination cell.");
  }

  const target = sheet.getRange(cell);

  if (
    target.getNumRows() !== 1 ||
    target.getNumColumns() !== 1
  ) {
    throw new Error("Select exactly one cell.");
  }

  return target;
}

function isOccupied(target) {
  return (
    target.isPartOfMerge() ||
    !target.isBlank()
  );
}

// ========================================
// 7. INSPECT DESTINATION
// ========================================

function inspectDestination(cell, sheetId) {
  const sheet = getWorksheetById(sheetId);
  const target = getValidTarget(sheet, cell);

  const occupied = isOccupied(target);

  return {
    success: true,
    cell: target.getA1Notation(),
    sheetId: String(sheetId),
    occupied: occupied,
    available: !occupied,
    message: occupied
      ? "Cell " + cell + " is occupied."
      : "Cell " + cell + " is available."
  };
}

// ========================================
// 8. CALCULATE NEXT CELL
// ========================================

function getNextCell(cell, sheetId, direction) {
  if (
    direction !== "down" &&
    direction !== "right"
  ) {
    throw new Error(
      "Direction must be down or right."
    );
  }

  const sheet = getWorksheetById(sheetId);
  const target = getValidTarget(sheet, cell);

  let row = target.getRow();
  let column = target.getColumn();

  if (direction === "down") {
    row++;
  } else {
    column++;
  }

  if (
    row > sheet.getMaxRows() ||
    column > sheet.getMaxColumns()
  ) {
    return {
      success: false,
      endOfSheet: true,
      message:
        "Reached the worksheet edge. " +
        "Select another starting cell."
    };
  }

  const next = sheet.getRange(row, column);
  const occupied = isOccupied(next);

  return {
    success: true,
    cell: next.getA1Notation(),
    sheetId: String(sheetId),
    occupied: occupied,
    available: !occupied
  };
}

// ========================================
// 9. FIND NEXT EMPTY CELL
// ========================================

function findNextEmptyCell(
  cell,
  sheetId,
  direction
) {
  if (
    direction !== "down" &&
    direction !== "right"
  ) {
    throw new Error(
      "Invalid automatic direction."
    );
  }

  const sheet = getWorksheetById(sheetId);
  const target = getValidTarget(sheet, cell);

  let row = target.getRow();
  let column = target.getColumn();

  for (let i = 0; i < MAX_SKIP_SCAN; i++) {
    if (direction === "down") {
      row++;
    } else {
      column++;
    }

    if (
      row > sheet.getMaxRows() ||
      column > sheet.getMaxColumns()
    ) {
      return {
        success: false,
        endOfSheet: true,
        message:
          "No more cells available in this direction."
      };
    }

    const next = sheet.getRange(row, column);

    if (!isOccupied(next)) {
      return {
        success: true,
        cell: next.getA1Notation(),
        sheetId: String(sheetId),
        occupied: false,
        available: true
      };
    }
  }

  return {
    success: false,
    message:
      "No empty cell found within " +
      MAX_SKIP_SCAN + " cells."
  };
}

// ========================================
// 10. UPLOAD PHOTO
// ========================================

function uploadPhoto(
  base64Data,
  mimeType,
  expectedCell,
  expectedSheetId,
  uploadMode,
  expectedSelectionAt
) {
  const mode = uploadMode || "manual";

  if (mode !== "manual" && mode !== "auto") {
    throw new Error("Invalid upload mode.");
  }

  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    throw new Error(
      "Only JPEG, PNG and WebP are supported."
    );
  }

  if (
    typeof base64Data !== "string" ||
    base64Data.length === 0
  ) {
    throw new Error("No photo data received.");
  }

  if (
    base64Data.length >
    Math.ceil(MAX_PHOTO_SIZE / 3) * 4 + 4
  ) {
    throw new Error(
      "Photo exceeds the 20 MB limit."
    );
  }

  const bytes = Utilities.base64Decode(base64Data);

  if (
    bytes.length === 0 ||
    bytes.length > MAX_PHOTO_SIZE
  ) {
    throw new Error(
      "Invalid photo size or photo exceeds 20 MB."
    );
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const properties =
      PropertiesService.getScriptProperties();

    const selectedCell =
      properties.getProperty("selectedCell");

    const selectedSheetId =
      properties.getProperty("selectedSheetId");

    const selectedAt = Number(
      properties.getProperty("selectedAt")
    );

    if (
      !selectedCell ||
      !selectedSheetId ||
      !selectedAt
    ) {
      throw new Error(
        "No starting cell selected."
      );
    }

    // New laptop selections override old
    // automatic destinations.

    const expectedAt = Number(expectedSelectionAt);

    if (
      !Number.isFinite(expectedAt) ||
      expectedAt <= 0
    ) {
      return {
        success: false,
        selectionChanged: true,
        cell: selectedCell,
        sheetId: selectedSheetId,
        selectedAt: selectedAt,
        message:
          "Refresh the destination before uploading."
      };
    }

    if (selectedAt !== expectedAt) {
      return {
        success: false,
        selectionChanged: true,
        cell: selectedCell,
        sheetId: selectedSheetId,
        selectedAt: selectedAt,
        message:
          "Laptop selection changed. " +
          "Check the new destination."
      };
    }

    if (mode === "manual") {
      if (
        Date.now() - selectedAt >
        SELECTION_TIMEOUT
      ) {
        return {
          success: false,
          selectionExpired: true,
          message:
            "Selection expired. Select a cell again."
        };
      }

      if (
        selectedCell !== expectedCell ||
        selectedSheetId !== String(expectedSheetId)
      ) {
        return {
          success: false,
          selectionChanged: true,
          cell: selectedCell,
          sheetId: selectedSheetId,
          selectedAt: selectedAt,
          message:
            "Destination changed. Try again."
        };
      }
    } else {
      if (
        selectedSheetId !== String(expectedSheetId)
      ) {
        return {
          success: false,
          selectionChanged: true,
          cell: selectedCell,
          sheetId: selectedSheetId,
          selectedAt: selectedAt,
          message:
            "Worksheet changed. Check destination."
        };
      }
    }

    const sheet = getWorksheetById(expectedSheetId);
    const target = getValidTarget(sheet, expectedCell);

    // Never overwrite an occupied cell.

    if (isOccupied(target)) {
      return {
        success: false,
        occupied: true,
        cell: target.getA1Notation(),
        sheetId: String(expectedSheetId),
        message:
          "Cell " +
          target.getA1Notation() +
          " is occupied."
      };
    }

    // Preserve original photo bytes.

    const extensions = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp"
    };

    const filename =
      "site-photo-" +
      Date.now() + "-" +
      Utilities.getUuid().slice(0, 8) +
      extensions[mimeType];

    const blob = Utilities.newBlob(
      bytes,
      mimeType,
      filename
    );

    // Automatically find or create the
    // correct folders for this worksheet.

    const folders = getFieldframeFolders(sheet);

    // Save original in the private folder.

    const originalFolder = folders.privateFolder;
    const originalFile = originalFolder.createFile(blob);

    console.log(
      "Original saved: " + originalFile.getId()
    );

    // Create separate display copy.

    let previewFile = null;

    try {
      const previewFolder = folders.publicFolder;

      previewFile = previewFolder.createFile(
        blob.copyBlob().setName(
          "preview-" + filename
        )
      );

      previewFile.setSharing(
        DriveApp.Access.ANYONE_WITH_LINK,
        DriveApp.Permission.VIEW
      );

      const imageUrl =
        "https://lh3.googleusercontent.com/d/" +
        encodeURIComponent(previewFile.getId());

      const cellImage =
        SpreadsheetApp.newCellImage()
          .setSourceUrl(imageUrl)
          .setAltTextTitle(
            "Site Inspection Photo"
          )
          .build();

      target.setValue(cellImage);

      sheet.setColumnWidth(
        target.getColumn(),
        PHOTO_WIDTH
      );

      sheet.setRowHeight(
        target.getRow(),
        PHOTO_HEIGHT
      );

      SpreadsheetApp.flush();

      return {
        success: true,
        occupied: false,
        cell: target.getA1Notation(),
        sheetId: String(expectedSheetId),
        fileId: originalFile.getId(),
        fileName: filename,
        fileSize: bytes.length,
        previewFileId: previewFile.getId(),
        insertedIntoSheet: true,
        message:
          "Photo saved and inserted inside " +
          target.getA1Notation() + "."
      };

    } catch (error) {
      // Keep the private original for recovery.

      if (previewFile) {
        try {
          previewFile.setTrashed(true);
        } catch (cleanupError) {
          console.error(
            "Preview cleanup failed: " +
            cleanupError.message
          );
        }
      }

      throw new Error(
        "Original saved to Drive, but " +
        "in-cell insertion failed: " +
        error.message
      );
    }

  } finally {
    lock.releaseLock();
  }
}

// ========================================
// 11. OPTIONAL TEST FUNCTIONS
// ========================================

function testSelectedCell() {
  console.log(getSelectedCell());
}

/**
 * Optional folder test.
 *
 * Creates folders for the active worksheet
 * without uploading a photo.
 *
 * Normal users never need to run this.
 */

function testPhotoFolder() {
  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error(
      "Google Spreadsheet was not found."
    );
  }

  const sheet = spreadsheet.getActiveSheet();

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const folders = getFieldframeFolders(sheet);

    console.log(
      "Spreadsheet folder: " +
      folders.rootFolder.getUrl()
    );

    console.log(
      "Worksheet folder: " +
      folders.worksheetFolder.getUrl()
    );

    console.log(
      "Private folder: " +
      folders.privateFolder.getUrl()
    );

    console.log(
      "Public folder: " +
      folders.publicFolder.getUrl()
    );

  } finally {
    lock.releaseLock();
  }
}
