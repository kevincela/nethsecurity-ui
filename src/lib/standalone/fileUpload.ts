import axios, { type AxiosProgressEvent } from 'axios'
import { getStandaloneApiEndpoint } from '../config'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'

export async function uploadFile(
  file: File,
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
) {
  const loginStore = useLoginStore()
  const formData = new FormData()

  formData.append('file', file)
  return axios.post(`${getStandaloneApiEndpoint()}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${loginStore.token}`
    },
    onUploadProgress
  })
}