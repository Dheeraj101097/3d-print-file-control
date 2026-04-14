import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const productsApi = createApi({
  reducerPath: 'productsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Product', 'Part', 'Subpart'],
  endpoints: (builder) => ({
    getProducts: builder.query({
      query: ({ page = 1, limit = 20 } = {}) => `/products?page=${page}&limit=${limit}`,
      providesTags: ['Product'],
    }),
    getProduct: builder.query({
      query: (slug) => `/products/${slug}`,
      providesTags: (result, error, slug) => [{ type: 'Product', id: slug }],
    }),
    createProduct: builder.mutation({
      query: (body) => ({ url: '/products', method: 'POST', body }),
      invalidatesTags: ['Product'],
    }),
    updateProduct: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/products/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Product'],
    }),
    deleteProduct: builder.mutation({
      query: (id) => ({ url: `/products/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Product'],
    }),
    cloneProduct: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/products/${id}/clone`, method: 'POST', body }),
      invalidatesTags: ['Product'],
    }),
    getProductStatus: builder.query({
      query: (id) => `/products/${id}/status`,
    }),
    getParts: builder.query({
      query: (productId) => `/products/${productId}/parts`,
      providesTags: (result, error, productId) => [{ type: 'Part', id: productId }],
    }),
    createPart: builder.mutation({
      query: ({ productId, ...body }) => ({
        url: `/products/${productId}/parts`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: 'Part', id: productId },
        { type: 'Product', id: 'LIST' },
      ],
    }),
    deletePart: builder.mutation({
      query: ({ productId, partId }) => ({
        url: `/products/${productId}/parts/${partId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { productId }) => [{ type: 'Part', id: productId }],
    }),
    getSubparts: builder.query({
      query: ({ productId, partId }) =>
        `/products/${productId}/parts/${partId}/subparts`,
      providesTags: (result, error, { partId }) => [{ type: 'Subpart', id: partId }],
    }),
    createSubpart: builder.mutation({
      query: ({ productId, partId, ...body }) => ({
        url: `/products/${productId}/parts/${partId}/subparts`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { partId }) => [{ type: 'Subpart', id: partId }],
    }),
    deleteSubpart: builder.mutation({
      query: ({ productId, partId, subpartId }) => ({
        url: `/products/${productId}/parts/${partId}/subparts/${subpartId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { partId }) => [{ type: 'Subpart', id: partId }],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useCloneProductMutation,
  useGetProductStatusQuery,
  useGetPartsQuery,
  useCreatePartMutation,
  useDeletePartMutation,
  useGetSubpartsQuery,
  useCreateSubpartMutation,
  useDeleteSubpartMutation,
} = productsApi;
