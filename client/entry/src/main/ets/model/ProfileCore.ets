export function cuisineForRegion(name: string): string {
 if (['重庆','四川'].includes(name)) { return '四川'; } if (['辽宁','吉林','黑龙江'].includes(name)) { return '东北'; } if (['北京','天津','河北','山西','内蒙古'].includes(name)) { return '华北'; } if (['陕西','甘肃','青海','宁夏','新疆'].includes(name)) { return '西北'; } if (['云南','贵州'].includes(name)) { return '云贵'; } if (['台湾','香港','澳门'].includes(name)) { return '港台'; } return name;
}
