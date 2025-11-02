import Replicate from 'replicate'
import dotenv from 'dotenv'
dotenv.config()

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
  userAgent: 'https://www.npmjs.com/package/create-replicate'
})
const model = 'easel/advanced-face-swap:602d8c526aca9e5081f0515649ff8998e058cf7e6b9ff32717d25327f18c5145'
const input = {
  upscale: true,
  detailer: false,
  swap_image: 'https://replicate.delivery/pbxt/Mb44Wp0W7Xfa1Pp91zcxDzSSQQz8GusUmXQXi3GGzRxDvoCI/0_1.webp',
  hair_source: 'target',
  user_gender: 'a woman',
  target_image: 'https://replicate.delivery/pbxt/Mb44XIUHkUrmyyH1OP5K1WmFN7SNN0eUSU16A8rBtuXe7eYV/cyberpunk_80s_example.png',
  user_b_gender: 'a woman',
}

console.log('Using model: %s', model)
console.log('With input: %O', input)

console.log('Running...')
const output = await replicate.run(model, { input })
console.log('Done!', output)
