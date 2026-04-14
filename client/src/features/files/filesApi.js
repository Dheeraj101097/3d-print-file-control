import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const filesApi = createApi({
  reducerPath: 'filesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['FileAsset', 'FileVersion'],
  endpoints: (builder) => ({
    getPartFiles: builder.query({
      query: (partId) => `/parts/${partId}/files`,
      providesTags: (result, error, partId) => [{ type: 'FileAsset', id: partId }],
    }),
    getFileVersions: builder.query({
      query: ({ fileAssetId, page = 1 }) => `/files/${fileAssetId}/versions?page=${page}`,
      providesTags: (result, error, { fileAssetId }) => [
        { type: 'FileVersion', id: fileAssetId },
      ],
    }),
    rollbackFile: builder.mutation({
      query: ({ fileAssetId, ...body }) => ({
        url: `/files/${fileAssetId}/rollback`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { fileAssetId }) => [
        { type: 'FileVersion', id: fileAssetId },
        { type: 'FileAsset', id: 'LIST' },
      ],
    }),
  }),
});

export const { useGetPartFilesQuery, useGetFileVersionsQuery, useRollbackFileMutation } = filesApi;
