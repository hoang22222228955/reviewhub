# reviewhub-api-platform
Centralized review hub and API platform for partners to submit, moderate, analyze, and consume reviews across multiple service domains.
PS C:\Windows\system32> Invoke-RestMethod `
>>   -Uri "http://localhost:8080/api/ai/advisor" `
>>   -Method POST `
>>   -ContentType "application/json" `
>>   -Body '{"message":"hello"}'


id                     : resp_0ef984a70a166a85006a02575bfde48195b12727453b96c9e9
object                 : response
created_at             : 1778538332
status                 : completed
background             : False
billing                : @{payer=developer}
completed_at           : 1778538334
error                  :
frequency_penalty      : 0.0
incomplete_details     :
instructions           :
max_output_tokens      :
max_tool_calls         :
model                  : gpt-4o-mini-2024-07-18
moderation             :
output                 : {@{id=msg_0ef984a70a166a85006a02575de3c881959339cb7f1d7f262f; type=message; status=completed;
                         content=System.Object[]; role=assistant}}
parallel_tool_calls    : True
presence_penalty       : 0.0
previous_response_id   :
prompt_cache_key       :
prompt_cache_retention : in_memory
reasoning              : @{effort=; summary=}
safety_identifier      :
service_tier           : default
store                  : True
temperature            : 1.0
text                   : @{format=; verbosity=medium}
tool_choice            : auto
tools                  : {}
top_logprobs           : 0
top_p                  : 1.0
truncation             : disabled
usage                  : @{input_tokens=516; input_tokens_details=; output_tokens=17; output_tokens_details=;
                         total_tokens=533}
user                   :
metadata               :



PS C:\Windows\system32>

test xem lỗi backend ko bên power :
Invoke-RestMethod `
  -Uri "http://localhost:8080/api/ai/advisor" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"message":"hello"}'
  

- admin@reviewhub.vn/123456
- partner@reviewhub.vn / 123456
- futa@reviewhub.vn / 123456
- anvui@reviewhub.vn/123456
phuongtrang@reviewhub.vn/ 123456
thanhbuoi@reviewhub.vn/ 123456
hungcuong@reviewhub.vn/ 123456

PT-011', name: 'Xe Hạnh
xehanh@reviewhub.vn/123456

xehanh1@reviewhub.vn/123456
Xe Minh Quân
minhquan@reviewhub.vn/ 123456

Đức Dương
ducduong@reviewhub.vn/ 123456

Kumho Samco
kumhosamco@reviewhub.vn/ 123456

'PT-013', name: 'Sao Việt
saoviet@reviewhub.vn/123456
chạy backend:

code: 'PT-015', name: 'Thuận Thảo
thuanthao@reviewhub.vn/123456

'PT-009', name: 'Cúc Tùng'
cuctung@reviewhub.vn/ 123456

PT-040', name: 'Như Vinh'
nhuvinh@reviewhub.vn/ 123456

Hùng Cường
hc@reviewhub.vn/123456
  
code: 'KS-001', name: 'Mường Thanh Luxury Đà Nẵng',
muongthanh@reviewhub.vn/ 123456

KS-002', name: 'Vinpearl Resort Nha Trang
vinpearlresort@reviewhub.vn/ 123456

code: 'KS-003', name: 'FLC Grand Hotel Hạ Long'
halong@reviewhub.vn/ 123456

code: 'KS-004', name: 'InterContinental Hanoi Westlake
hoangtran@reviewhub.vn/123456

code: 'KS-010', name: 'Dalat Palace Heritage Hotel

dalat@reviewhub.vn/123456

hoangminh@reviewhub.vn/123456

{ code: 'KS-013', name: 'Sofitel Legend Metropole Hanoi', region: 'Hà Nội', type: 'Khách sạn 5 sao / Khách sạn di sản', hotline: 'Đang cập nhật', website: 'sofitel-legend-metropole-hanoi.com', description: 'Khách sạn di sản nổi tiếng tại trung tâm Hà Nội, phong cách cổ điển sang trọng, phù hợp khách nghỉ dưỡng cao cấp, công tác và du lịch văn hóa.' },
  { code: 'KS-014', name: 'JW Marriott Hotel Hanoi', region: 'Hà Nội', type: 'Khách sạn 5 sao', hotline: 'Đang cập nhật', website: 'marriott.com', description: 'Khách sạn 5 sao cao cấp tại Hà Nội, nổi bật với không gian hiện đại, dịch vụ chuyên nghiệp, phù hợp hội nghị, công tác và nghỉ dưỡng.' },
  { code: 'KS-015', name: 'Sheraton Saigon Grand Opera Hotel', region: 'TP. Hồ Chí Minh', type: 'Khách sạn 5 sao', hotline: 'Đang cập nhật', website: 'marriott.com', description: 'Khách sạn 5 sao tại trung tâm Quận 1, gần Nhà hát Thành phố, phù hợp khách công tác, du lịch cao cấp và khách quốc tế.' },
  { code: 'KS-016', name: 'InterContinental Danang Sun Peninsula Resort', region: 'Đà Nẵng', type: 'Resort biển 5 sao', hotline: 'Đang cập nhật', website: 'ihg.com', description: 'Resort biển cao cấp tại bán đảo Sơn Trà, nổi bật với kiến trúc độc đáo, không gian nghỉ dưỡng sang trọng và dịch vụ quốc tế.' },
  { code: 'KS-017', name: 'Meliá Hanoi', region: 'Hà Nội', type: 'Khách sạn 5 sao', hotline: 'Đang cập nhật', website: 'melia.com', description: 'Khách sạn 5 sao tại trung tâm Hà Nội, vị trí thuận tiện, phù hợp khách công tác, hội nghị và du lịch thành phố.' },
  { code: 'KS-018', name: 'Caravelle Saigon', region: 'TP. Hồ Chí Minh', type: 'Khách sạn 5 sao', hotline: 'Đang cập nhật', website: 'caravellehotel.com', description: 'Khách sạn lâu đời tại trung tâm Sài Gòn, gần Nhà hát Thành phố, nổi bật với vị trí đẹp, dịch vụ chuyên nghiệp và phong cách sang trọng.' },
  { code: 'KS-019', name: 'New World Saigon Hotel', region: 'TP. Hồ Chí Minh', type: 'Khách sạn 5 sao', hotline: 'Đang cập nhật', website: 'newworldhotels.com', description: 'Khách sạn 5 sao tại trung tâm TP. Hồ Chí Minh, gần chợ Bến Thành và các điểm du lịch, phù hợp công tác, sự kiện và nghỉ dưỡng.' },
  { code: 'KS-020', name: 'Pan Pacific Hanoi
saigonmorin@reviewhub.vn/123456

admin@reviewhub.vn / 123456

hoang01@reviewhub.vn/123456
hoang02@reviewhub.vn/123456
hoang03@reviewhub.vn/123456
hoang04@reviewhub.vn/123456
hoang05@reviewhub.vn/123456
hoang06@reviewhub.vn/123456 gói tự chọn
hoang07@reviewhub.vn/123456

hoang08@reviewhub.vn/123456

hoang09@reviewhub.vn/123456 3 gói

hoang10@reviewhub.vn/123456



hoang11@reviewhub.vn/123456

hoang12@reviewhub.vn/123456

hoang13@reviewhub.vn/123456

hoang14@reviewhub.vn/123456

hoang15@reviewhub.vn/123456

hoang16@reviewhub.vn/123456


hoang17@reviewhub.vn/123456

hoang18@reviewhub.vn/123456

hoang19@reviewhub.vn/123456

MB-017', name: 'Japan Airlines', region: 'Nhật Bản / Quốc tế', type: 'Hãng hàng không quốc tế', hotline: '028 3827 9155', website: 'jal.co.jp', description: 'Hãng hàng không Nhật Bản, phù hợp tuyến Việt Nam - Nhật Bản và các hành trình quốc tế.' },
  { code: 'MB-018', name: 'All Nippon Airways', region: 'Nhật Bản / Quốc tế', type: 'Hãng hàng không quốc tế', hotline: '028 3822 9612', website: 'ana.co.jp', description: 'Hãng bay Nhật Bản nổi bật về dịch vụ, đúng giờ và trải nghiệm bay quốc tế.' },
  { code: 'MB-019', name: 'Turkish Airlines', region: 'Châu Âu / Quốc tế', type: 'Hãng hàng không quốc tế', hotline: '028 3827 8888', website: 'turkishairlines.com', description: 'Hãng bay quốc tế kết nối Việt Nam với châu Âu, Trung Đông và nhiều điểm đến toàn cầu.' },
  { code: 'MB-020', name: 'Lufthans'a

cd C:\Users\Admin\Downloads\reviewhub-api-platform-main\reviewhub-api-platform-main\backend\reviewhub
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
.\mvnw.cmd clean spring-boot:run

cd C:\reviewhub-api-platform2-master\backend\reviewhub
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
.\mvnw.cmd clean spring-boot:run


chạy frontend:
npm run dev


git add .
git commit -m "Update code"
git push







SELECT 

  operator_code,

  target_code,

  owner_partner_code,

  moderation_status,

  visibility,

  source_system,

  COUNT(*) AS total

FROM reviews

WHERE operator_code = 'KS-001' 

   OR target_code = 'KS-001'

   OR owner_partner_code = 'KS-001'

GROUP BY operator_code, target_code, owner_partner_code, moderation_status, visibility, source_system

ORDER BY total DESC;