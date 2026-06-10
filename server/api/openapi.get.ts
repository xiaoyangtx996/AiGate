import openapiSpec from '../../docs/openapi.json'

export default defineEventHandler(event => {
  setResponseHeader(event, 'Content-Type', 'application/json')
  return openapiSpec
})
