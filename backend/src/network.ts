import compression from 'compression';
/** Only public catalog payloads are compressed; private AI/auth/sync payloads stay out. */
export function catalogCompression(){return compression({threshold:1024,level:4,filter:(req,res)=>/^\/api\/v1\/catalog\/(recipes|taxonomy|offline)(\/|\?|$)/.test(req.originalUrl)&&compression.filter(req,res)});}
