import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const printerProfilesApi = createApi({
  reducerPath: 'printerProfilesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/printer-profiles',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['PrinterProfile'],
  endpoints: (builder) => ({
    getProfiles: builder.query({
      query: () => '/',
      providesTags: ['PrinterProfile'],
    }),
    createProfile: builder.mutation({
      query: (body) => ({ url: '/', method: 'POST', body }),
      invalidatesTags: ['PrinterProfile'],
    }),
    updateProfile: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/${id}`, method: 'PUT', body }),
      invalidatesTags: ['PrinterProfile'],
    }),
    deleteProfile: builder.mutation({
      query: (id) => ({ url: `/${id}`, method: 'DELETE' }),
      invalidatesTags: ['PrinterProfile'],
    }),
  }),
});

export const {
  useGetProfilesQuery,
  useCreateProfileMutation,
  useUpdateProfileMutation,
  useDeleteProfileMutation,
} = printerProfilesApi;
