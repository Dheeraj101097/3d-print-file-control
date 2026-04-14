import { createSlice } from '@reduxjs/toolkit';

const filesSlice = createSlice({
  name: 'files',
  initialState: {
    uploadProgress: 0,     // 0–100
    isUploading: false,
    lastPushedAsset: null, // most recently pushed FileAsset (for UI feedback)
  },
  reducers: {
    setUploadProgress(state, action) {
      state.uploadProgress = action.payload;
      state.isUploading = action.payload < 100;
    },
    setUploading(state, action) {
      state.isUploading = action.payload;
      if (!action.payload) state.uploadProgress = 0;
    },
    setLastPushedAsset(state, action) {
      state.lastPushedAsset = action.payload;
    },
    resetUpload(state) {
      state.uploadProgress = 0;
      state.isUploading = false;
    },
  },
});

export const { setUploadProgress, setUploading, setLastPushedAsset, resetUpload } =
  filesSlice.actions;

export const selectUploadProgress = (state) => state.files.uploadProgress;
export const selectIsUploading = (state) => state.files.isUploading;
export const selectLastPushedAsset = (state) => state.files.lastPushedAsset;

export default filesSlice.reducer;
