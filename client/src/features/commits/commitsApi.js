import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import getBaseUrl from '../../api/baseUrl.js';

export const commitsApi = createApi({
  reducerPath: 'commitsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: getBaseUrl(),
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Commit'],
  endpoints: (builder) => ({
    getCommits: builder.query({
      query: ({ productId, page = 1, limit = 30 }) =>
        `/products/${productId}/commits?page=${page}&limit=${limit}`,
      providesTags: (result, error, { productId }) => [{ type: 'Commit', id: productId }],
    }),
    getCommit: builder.query({
      query: (commitId) => `/commits/${commitId}`,
      providesTags: (result, error, id) => [{ type: 'Commit', id }],
    }),
    tagCommit: builder.mutation({
      query: ({ commitId, tag }) => ({
        url: `/commits/${commitId}/tag`,
        method: 'POST',
        body: { tag },
      }),
      invalidatesTags: (result, error, { commitId }) => [{ type: 'Commit', id: commitId }],
    }),
  }),
});

export const { useGetCommitsQuery, useGetCommitQuery, useTagCommitMutation } = commitsApi;
