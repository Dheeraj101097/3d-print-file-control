import { createSlice } from '@reduxjs/toolkit';

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    selectedProduct: null,
    selectedPartId: null,
    selectedSubpartId: null,
    selectedFileAssetId: null,
  },
  reducers: {
    setSelectedProduct(state, action) {
      state.selectedProduct = action.payload;
      state.selectedPartId = null;
      state.selectedSubpartId = null;
      state.selectedFileAssetId = null;
    },
    setSelectedPart(state, action) {
      state.selectedPartId = action.payload;
      state.selectedSubpartId = null;
      state.selectedFileAssetId = null;
    },
    setSelectedSubpart(state, action) {
      state.selectedSubpartId = action.payload;
      state.selectedFileAssetId = null;
    },
    setSelectedFileAsset(state, action) {
      state.selectedFileAssetId = action.payload;
    },
    clearSelection(state) {
      state.selectedProduct = null;
      state.selectedPartId = null;
      state.selectedSubpartId = null;
      state.selectedFileAssetId = null;
    },
  },
});

export const {
  setSelectedProduct,
  setSelectedPart,
  setSelectedSubpart,
  setSelectedFileAsset,
  clearSelection,
} = productsSlice.actions;

export const selectSelectedProduct = (state) => state.products.selectedProduct;
export const selectSelectedPartId = (state) => state.products.selectedPartId;
export const selectSelectedSubpartId = (state) => state.products.selectedSubpartId;
export const selectSelectedFileAssetId = (state) => state.products.selectedFileAssetId;

export default productsSlice.reducer;
