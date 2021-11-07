const axios = require("axios")
const hashtagPageBase = "https://youtube.com/hashtag/"
const ajaxUrl = 'https://www.youtube.com/youtubei/v1/browse?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'

class HashtagRequester {   
    static async requestHashtagPage(payload) {
        const config = {
            headers: {
                'x-youtube-client-name': '1',
                'x-youtube-client-version': '2.20180222',
                'accept-language': 'en-US,en;q=0.5'
            }
        }
        try {
            let geoLocation = payload.geoLocation
            let tag = payload.tag
            let continuation = payload.continuation
            const params = {}
            if (geoLocation) {
                params['persist_gl'] = 1
                params['gl'] = geoLocation
            }
            if (continuation) {
                const urlParams = {
                    context: {
                      client: {
                        clientName: 'WEB',
                        clientVersion: '2.20201021.03.00',
                      },
                    },
                    continuation: continuation
                  }              
                  return await axios.post(ajaxUrl, urlParams)              
            } else {
                return await axios.get(hashtagPageBase + tag, {params})
            }

        } catch (e) {
            return {
                error: true,
                message: e
            }
        }
    }
}
module.exports = HashtagRequester
