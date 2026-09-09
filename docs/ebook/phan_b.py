# -*- coding: utf-8 -*-
"""Noi dung: Dockerfile, anh Docker, da kien truc, phat hanh, thiet ke loi, phu luc."""
from reportlab.platypus import PageBreak, Spacer
from render import DO, MUC, S, XANH, bang, cham, hop, khoi_ma, P
from phan_a import h2, h3, phan, tua


# ---------------------------------------------------------------- PHAN IV

def phan_iv():
    r = phan("IV", "Dockerfile và ảnh", "Nơi sai lầm bắt đầu đắt")

    r += [tua(7, "Dockerfile: cấu trúc và thứ tự"),
          P("Một Dockerfile trông như một kịch bản shell, và đó chính là lý do người ta "
            "viết nó sai. Nó không phải kịch bản. Nó là **bản mô tả một chuỗi lớp**, và "
            "thứ tự các dòng quyết định cả tốc độ dựng lẫn dung lượng cuối cùng.")]

    r += [h2("7.1 Mỗi lệnh là một lớp, và lớp thì không xoá được"),
          P("Mỗi `RUN`, `COPY`, `ADD` sinh ra một lớp mới xếp lên lớp trước. Điểm cốt tử: "
            "lớp sau **không thể xoá dữ liệu** của lớp trước, chỉ có thể che nó đi. Tải về "
            "một tệp 200 MB ở một dòng rồi xoá nó ở dòng sau, ảnh của bạn vẫn nặng thêm "
            "200 MB — tệp ấy vẫn nằm trong lớp cũ, chỉ không còn thấy được."),
          khoi_ma("# Sai: tep tai ve nam mai trong lop thu nhat\n"
                  "RUN wget https://vi.du/bo-cai.tar.gz\n"
                  "RUN tar -xzf bo-cai.tar.gz && rm bo-cai.tar.gz\n\n"
                  "# Dung: tai, dung, va don trong cung mot lop\n"
                  "RUN wget https://vi.du/bo-cai.tar.gz \\\n"
                  "    && tar -xzf bo-cai.tar.gz \\\n"
                  "    && rm bo-cai.tar.gz",
                  "Cùng một việc, hai dung lượng khác nhau"),
          h2("7.2 Thứ tự quyết định bộ nhớ đệm"),
          P("Docker dùng lại một lớp khi lệnh sinh ra nó và mọi thứ nó phụ thuộc đều không "
            "đổi. Một lớp bị coi là *bẩn* thì mọi lớp sau nó cũng bẩn theo. Từ đó ra một "
            "quy tắc đơn giản: **đặt thứ ít thay đổi lên trước**."),
          P("Trong một dự án Java hay Node, phần khai báo phụ thuộc thay đổi vài tuần một "
            "lần, còn mã nguồn thay đổi vài phút một lần. Nếu bạn chép cả thư mục vào rồi "
            "mới tải phụ thuộc, mỗi lần sửa một dòng mã là tải lại toàn bộ thư viện."),
          khoi_ma("FROM maven:3.9-eclipse-temurin-17 AS build\n"
                  "WORKDIR /build\n\n"
                  "# Chi khai bao phu thuoc truoc: doi rat it, nen lop nay dung lai duoc lau\n"
                  "COPY pom.xml .\n"
                  "RUN mvn -B dependency:go-offline\n\n"
                  "# Ma nguon vao sau: sua ma khong lam mat lop tai thu vien o tren\n"
                  "COPY src ./src\n"
                  "RUN mvn -B clean package -DskipTests",
                  "Sắp xếp để bộ nhớ đệm còn tác dụng"),
          h2("7.3 Nhiều giai đoạn: dựng ở một nơi, chạy ở nơi khác"),
          P("Bộ công cụ biên dịch nặng hơn thứ chạy thật rất nhiều. Ảnh Maven kèm JDK "
            "khoảng 600 MB; một JRE đủ để chạy chỉ khoảng 50 MB. Không có lý gì để mang bộ "
            "biên dịch lên máy chủ."),
          P("Nhiều giai đoạn giải quyết chuyện này: giai đoạn đầu dựng, giai đoạn cuối chỉ "
            "**chép kết quả** sang một ảnh nền gọn. Mọi thứ ở giai đoạn đầu bị bỏ lại."),
          khoi_ma("FROM bellsoft/liberica-openjre-alpine:17\n"
                  "WORKDIR /app\n"
                  "COPY --from=build /build/target/*.jar app.jar\n"
                  "ENTRYPOINT [\"java\", \"-jar\", \"app.jar\"]",
                  "Giai đoạn chạy chỉ nhận đúng thứ cần"),
          h2("7.4 Tệp `.dockerignore`: thứ hay bị quên nhất"),
          P("Không có tệp này, `COPY . .` sẽ nhồi cả `node_modules`, `target`, `.git` và "
            "mọi tệp cấu hình cục bộ vào ngữ cảnh dựng. Hậu quả không chỉ là chậm: một tệp "
            "`.env` lọt vào ảnh là bí mật đã rời khỏi máy bạn."),
          khoi_ma(".git\nnode_modules\ntarget\n.next\n*.log\n.env\n.env.*",
                  "Một .dockerignore tối thiểu"),
          PageBreak()]

    r += [tua(8, "Người dùng, quyền, và volume"),
          P("Container chạy bằng `root` là mặc định, và là mặc định nên đổi. Nhưng đổi "
            "không đúng chỗ thì sinh ra một lỗi chỉ lộ ra lúc chạy thật — loại lỗi tệ nhất."),
          h3("SC-09 · Container không ghi được vào volume của chính nó"),
          hop("TRIỆU CHỨNG", [
              "Ảnh dựng xong, container khởi động, rồi chết ngay khi ghi tệp đầu tiên:"], DO),
          khoi_ma("java.nio.file.AccessDeniedException: /app/data/settings.json"),
          P("Chuỗi nhân quả ở đây có ba mắt, và phải hiểu cả ba mới sửa đúng. Khi Docker "
            "tạo một volume mới, nó **kế thừa quyền sở hữu từ thư mục tương ứng trong "
            "ảnh**. Nếu thư mục đó thuộc `root` mà tiến trình lại chạy bằng người dùng "
            "thường, tiến trình không ghi được. Và vì volume chỉ lấy quyền *một lần lúc "
            "tạo*, sửa Dockerfile rồi dựng lại vẫn không đủ — volume cũ giữ nguyên quyền "
            "sai."),
          khoi_ma("RUN addgroup -S rapphim && adduser -S rapphim -G rapphim\n\n"
                  "# Phai tao thu muc VA giao quyen TRUOC khi doi user.\n"
                  "# Lam sau dong USER thi khong con quyen ma chown nua.\n"
                  "RUN mkdir -p /app/data && chown -R rapphim:rapphim /app/data\n\n"
                  "USER rapphim\n"
                  "COPY --from=build --chown=rapphim:rapphim /build/target/*.jar app.jar",
                  "Thứ tự đúng trong Dockerfile"),
          khoi_ma("docker compose down\n"
                  "docker volume rm ten-du-an_du-lieu    # volume cu giu quyen sai\n"
                  "docker compose up -d                  # volume moi ke thua quyen dung",
                  "Và phải bỏ volume cũ đi"),
          hop("BÀI HỌC", [
              "Volume là trạng thái tồn tại lâu hơn ảnh. Khi sửa một lỗi liên quan tới "
              "quyền hay dữ liệu ban đầu, hãy hỏi thêm: *có trạng thái cũ nào còn sót lại "
              "làm bản sửa của tôi vô hiệu không?*"], XANH),
          PageBreak()]

    r += [tua(9, "Lúc dựng và lúc chạy: ranh giới hay bị xoá nhoà"),
          P("Đây là nhóm lỗi tôi thấy gây thiệt hại nhiều nhất, vì nó không làm gì sập. Ảnh "
            "dựng thành công, container khởi động khoẻ mạnh, và sản phẩm thì sai."),
          h3("SC-10 · Địa chỉ mạng nội bộ bị nướng vào ảnh"),
          hop("TRIỆU CHỨNG", [
              "Triển khai xong, trang tải được nhưng trắng trơn. Không lỗi nào trong log. "
              "Kích thước trang trả về 39 KB thay vì 300 KB — bộ khung có, dữ liệu không."],
              DO),
          P("Các khung giao diện hiện đại **thay thế biến môi trường ngay lúc dựng** cho "
            "những biến dành cho trình duyệt. Với Next.js đó là tiền tố `NEXT_PUBLIC_`. "
            "Giá trị bạn đưa vào lúc `docker build` không còn là biến nữa; nó trở thành "
            "chuỗi ký tự nằm cứng trong tệp JavaScript."),
          P("Chúng tôi đưa địa chỉ mạng nội bộ `192.168.100.169:8081` vào lúc dựng. Ảnh "
            "chạy được trên đúng mạng đó, và vô dụng ở mọi nơi khác. Tệ hơn: chính "
            "container lại không gọi được địa chỉ LAN ấy, nên phần kết xuất phía máy chủ "
            "treo và trả ra trang rỗng."),
          P("Lời giải là tách hai đường gọi, vì chúng thật sự là hai đường khác nhau:"),
          bang(["Biến", "Ai dùng", "Giá trị đúng", "Nằm trong ảnh?"],
               [["`NEXT_PUBLIC_API_BASE_URL`", "Trình duyệt người xem",
                 "Đường tương đối, để proxy lo", "Có, không tránh được"],
                ["`API_INTERNAL_URL`", "Tiến trình trong container",
                 "`http://backend:8080`", "Không, đọc lúc chạy"]],
               [135, 95, 115, 85]),
          P("Cách chắc chắn nhất là **đừng để trình duyệt biết địa chỉ backend**. Cho mọi "
            "yêu cầu đi qua một đường dẫn tương đối trên chính máy chủ web, rồi để máy chủ "
            "đó chuyển tiếp. Lúc ấy ảnh không chứa địa chỉ nào, và dùng được ở mọi nơi."),
          h3("SC-11 · Ảnh nền thiếu công cụ mà healthcheck cần"),
          hop("TRIỆU CHỨNG", [
              "Ảnh dựng xanh, container chạy, nhưng mãi bị đánh dấu `unhealthy`. Dịch vụ "
              "phụ thuộc nó thì không bao giờ khởi động."], DO),
          P("`HEALTHCHECK` chạy lệnh **bên trong** container. Nếu bạn viết `wget` hay "
            "`curl` mà ảnh nền không có, phép kiểm luôn thất bại — dù ứng dụng hoàn toàn "
            "bình thường. Ảnh nền Alpine có sẵn `wget` nhờ busybox; ảnh nền Debian hay "
            "Ubuntu tối giản thì **không có cả hai**."),
          P("Đây là lý do rất thực tế để cân nhắc kỹ khi đổi ảnh nền. Trong dự án này, "
            "chuyện đó quyết định lựa chọn ở chương sau: giữ nền Alpine để không phải viết "
            "lại `HEALTHCHECK` và lệnh tạo người dùng."),
          khoi_ma("# Tren nen Alpine: dung ngay\n"
                  "HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/actuator/health || exit 1\n\n"
                  "# Tren nen Ubuntu: phai cai them, hoac doi phep kiem\n"
                  "RUN apt-get update && apt-get install -y --no-install-recommends curl \\\n"
                  "    && rm -rf /var/lib/apt/lists/*",
                  "Cùng một ý định, hai nền khác nhau"),
          hop("BÀI HỌC", [
              "Đổi ảnh nền không chỉ đổi dung lượng. Nó đổi cả tập lệnh có sẵn, cú pháp "
              "tạo người dùng, và thư viện hệ thống. Hãy đọc lại toàn bộ Dockerfile mỗi "
              "lần đổi dòng `FROM`."], XANH),
          PageBreak()]
    return r


# ---------------------------------------------------------------- PHAN V

def phan_v():
    r = phan("V", "Đa kiến trúc và phát hành",
             "Khi ảnh của bạn rời khỏi máy bạn")

    r += [tua(10, "Ảnh chạy trên nhiều kiến trúc"),
          P("Chừng nào ảnh chỉ chạy trên máy bạn, kiến trúc không phải vấn đề. Khoảnh khắc "
            "bạn nói *ai cũng cài được*, nó trở thành vấn đề trung tâm — vì máy Mac dùng "
            "chip Apple, máy chủ giá rẻ dùng ARM, và cả hai đều không chạy được ảnh amd64 "
            "một cách tử tế.")]

    r += [h2("10.1 Ảnh đa kiến trúc thật ra là gì"),
          P("Một nhãn như `latest` không trỏ tới một ảnh. Nó trỏ tới một **bảng chỉ mục** "
            "liệt kê nhiều ảnh, mỗi ảnh kèm nền tảng của nó. Khi bạn kéo về, Docker đọc "
            "bảng đó và chọn dòng khớp với máy bạn. Hiểu điều này là hiểu tất cả các lỗi "
            "còn lại trong chương."),
          khoi_ma("docker buildx imagetools inspect ghcr.io/chu-so-huu/ten-anh:latest",
                  "Xem một nhãn thật sự chứa những nền tảng nào"),
          h3("SC-12 · Ảnh nền không có kiến trúc bạn cần"),
          hop("TRIỆU CHỨNG", ["Việc dựng cho ARM hỏng ngay ở bước kéo ảnh nền:"], DO),
          khoi_ma("ERROR: failed to solve: eclipse-temurin:17-jre-alpine: failed to resolve\n"
                  "source metadata for docker.io/library/eclipse-temurin:17-jre-alpine:\n"
                  "no match for platform in manifest: not found"),
          P("Câu `no match for platform in manifest` nói rất chính xác: bảng chỉ mục của ảnh "
            "nền không có dòng nào cho nền tảng bạn yêu cầu. Không phải mạng lỗi, không "
            "phải gõ sai tên. Ảnh đó **chưa từng được phát hành** cho kiến trúc ấy."),
          P("Đây là sự cố do tôi gây ra, theo cách đáng nói: tôi đã viết trong mô tả thay "
            "đổi rằng cả ba ảnh nền đều có bản arm64, dựa vào trí nhớ. Bản Alpine của "
            "Eclipse Temurin chỉ có amd64. Ba mươi giây tra cứu đã tránh được cả lần dựng "
            "hỏng và một khẳng định sai trong tài liệu."),
          khoi_ma("docker buildx imagetools inspect eclipse-temurin:17-jre-alpine\n\n"
                  "# Hoac khong can Docker, goi thang registry:\n"
                  "curl.exe -s \"https://auth.docker.io/token?service=registry.docker.io\n"
                  "&scope=repository:library/eclipse-temurin:pull\"",
                  "Kiểm nền tảng trước khi tin"),
          P("Kết quả đo được khi chọn ảnh thay thế, xếp theo dung lượng lớp nền đã nén cho "
            "arm64:"),
          bang(["Ảnh nền", "Kiến trúc", "arm64"],
               [["`eclipse-temurin:17-jre-alpine`", "chỉ amd64", "—"],
                ["`bellsoft/liberica-openjre-alpine:17`", "amd64, arm64", "**44 MB**"],
                ["`azul/zulu-openjdk-alpine:17-jre`", "amd64, arm64", "72 MB"],
                ["`eclipse-temurin:17-jre-noble`", "sáu kiến trúc", "89 MB"],
                ["`amazoncorretto:17-alpine`", "amd64, arm64", "145 MB"]],
               [205, 125, 70]),
          P("Bảng này lật một giả định phổ biến: *Alpine thì nhẹ hơn*. Bản Alpine nặng nhất "
            "bảng, vì nó đóng gói cả JDK thay vì chỉ JRE. Nếu tôi chọn theo trực giác thay "
            "vì theo số đo, ảnh đã phồng lên gấp ba."),
          PageBreak()]

    r += [h3("SC-13 · Hai máy dựng ghi đè nhãn của nhau"),
          hop("TRIỆU CHỨNG", [
              "Quy trình báo thành công, nhưng nhãn `latest` chỉ chứa một kiến trúc. Kiến "
              "trúc kia biến mất không dấu vết."], DO),
          P("Đây là cái bẫy tinh vi nhất của việc dựng đa kiến trúc trên nhiều máy song "
            "song. Nếu mỗi máy tự gắn nhãn `latest` cho bản của mình, máy nào xong sau sẽ "
            "**ghi đè** lên nhãn của máy xong trước. Nhãn là một con trỏ, và con trỏ chỉ "
            "trỏ được vào một chỗ."),
          P("Đáng lo là mọi thứ vẫn xanh. Không có lỗi nào để đọc. Bạn chỉ phát hiện khi có "
            "người trên kiến trúc kia báo không chạy được."),
          P("Cách làm đúng gồm hai bước tách biệt. Bước dựng đẩy từng bản lên registry "
            "**không kèm nhãn**, chỉ định danh bằng digest. Bước gộp nối các digest ấy "
            "thành một bảng chỉ mục rồi mới gắn nhãn:"),
          khoi_ma("# Buoc 1 - tren tung may, day len ma khong dat nhan\n"
                  "- uses: docker/build-push-action@v6\n"
                  "  with:\n"
                  "    platforms: linux/${{ matrix.platform.name }}\n"
                  "    outputs: type=image,name=${{ env.ANH }},push-by-digest=true,\n"
                  "             name-canonical=true,push=true\n\n"
                  "# Buoc 2 - mot viec rieng: gop cac digest lai roi moi gan nhan\n"
                  "- run: |\n"
                  "    docker buildx imagetools create \n"
                  "      $(jq -cr '.tags | map(\"-t \" + .) | join(\" \")' \n"
                  "        <<< \"$DOCKER_METADATA_OUTPUT_JSON\") \n"
                  "      $(printf '${{ env.ANH }}@sha256:%s ' *)",
                  "Đẩy theo digest, rồi mới gộp và gắn nhãn"),
          hop("BÀI HỌC", [
              "Khi nhiều việc song song cùng ghi vào một tên chung, hãy giả định chúng sẽ "
              "ghi đè lên nhau. Cho mỗi việc ghi vào một địa chỉ riêng, rồi hợp nhất ở một "
              "bước có thứ tự rõ ràng."], XANH)]

    r += [h3("SC-14 · Bộ nhớ đệm dùng chung giữa hai kiến trúc"),
          hop("TRIỆU CHỨNG", [
              "Thời gian dựng thất thường, có lần lâu bất thường, có lần ra ảnh sai kiến "
              "trúc một cách khó hiểu."], DO),
          P("Lớp đã dựng cho amd64 không dùng lại được cho arm64 — chúng chứa mã máy khác "
            "nhau. Nếu hai việc dùng chung một phạm vi bộ nhớ đệm, chúng sẽ liên tục ghi đè "
            "kết quả của nhau. Cách chữa là tách phạm vi theo cả ảnh và kiến trúc:"),
          khoi_ma("cache-from: type=gha,scope=${{ matrix.image.name }}-${{ matrix.platform.name }}\n"
                  "cache-to:   type=gha,mode=max,scope=${{ matrix.image.name }}-${{ matrix.platform.name }}",
                  "Mỗi ảnh, mỗi kiến trúc một kho đệm riêng"),
          h2("10.2 Dựng thật hay giả lập?"),
          P("Có hai đường để ra ảnh ARM. Đường thứ nhất: giả lập bằng QEMU trên máy amd64 — "
            "cấu hình một dòng, nhưng biên dịch Java hay Next.js dưới giả lập chậm tới mức "
            "dễ vượt hạn mức thời gian. Đường thứ hai: dựng trên máy ARM thật."),
          P("Với kho mã nguồn công khai, GitHub cấp runner ARM miễn phí. Chúng tôi chọn "
            "đường thứ hai và không tốn thêm gì. Đổi lại là cấu trúc quy trình phức tạp "
            "hơn — chính là hai bước ở SC-13."),
          hop("CÂN NHẮC", [
              "Giả lập rẻ về cấu hình, đắt về thời gian mỗi lần chạy. Máy thật ngược lại. "
              "Với một việc chạy hàng chục lần mỗi tuần, cái đắt lặp lại luôn thắng cái "
              "đắt một lần."], MUC),
          PageBreak()]

    r += [tua(11, "Registry và quyền hiển thị"),
          P("Dựng được ảnh chưa phải là phát hành được ảnh. Giữa hai việc đó có một bước mà "
            "quy trình xanh không nói cho bạn biết."),
          h3("SC-15 · Ảnh riêng tư, nhưng không ai báo"),
          hop("TRIỆU CHỨNG", [
              "Quy trình thành công, ảnh có trên registry, hướng dẫn cài đặt trỏ đúng địa "
              "chỉ. Người khác cài thì nhận `denied`."], DO),
          P("Ảnh do quy trình tự động đẩy lên GitHub Container Registry mặc định là **riêng "
            "tư**, bất kể kho mã nguồn công khai. Không có cảnh báo nào, vì với chính bạn "
            "mọi thứ hoạt động — thẻ xác thực của bạn có quyền."),
          P("Còn một cái bẫy nữa: quyền hiển thị của *kho mã nguồn* và của *gói* là hai thứ "
            "tách rời. Đổi kho sang công khai không đổi gói. Trong dự án này, phải ba lần "
            "thao tác mới thật sự xong, vì hộp thoại xác nhận bắt gõ lại đúng tên gói và "
            "việc bỏ ngang không để lại thông báo nào."),
          h3("SC-16 · Cách kiểm mà không cần đăng nhập"),
          P("Đây là kỹ thuật tôi thấy đáng giá nhất trong cả chương, vì nó trả lời đúng câu "
            "hỏi bạn cần: *người ngoài có kéo được không?* Đăng nhập rồi kéo thử không trả "
            "lời được câu đó — bạn luôn có quyền với ảnh của mình."),
          P("Registry theo chuẩn OCI cấp một thẻ đọc ẩn danh cho ảnh công khai, và từ chối "
            "với ảnh riêng tư. Chỉ cần gọi đúng một địa chỉ:"),
          khoi_ma("curl.exe -s \"https://ghcr.io/token?service=ghcr.io\n"
                  "&scope=repository:chu-so-huu/ten-anh:pull\"\n\n"
                  "# Co \"token\"        -> cong khai, nguoi ngoai keo duoc\n"
                  "# Ra UNAUTHORIZED    -> con rieng tu",
                  "Phép thử dứt điểm, không cần đăng nhập"),
          hop("QUAN TRỌNG", [
              "Hãy luôn kiểm cùng một phép thử trên một ảnh **đã biết chắc là công khai** "
              "để đối chứng. Có lần tôi kết luận sai vì lệnh bóc chuỗi của tôi âm thầm trả "
              "về nguyên văn JSON lỗi, mà chuỗi đó lại dài hơn ngưỡng tôi kiểm — phép thử "
              "hỏng, chứ không phải kết quả xấu."], DO),
          hop("BÀI HỌC", [
              "Một phép kiểm chỉ đáng tin khi bạn đã thấy nó **thất bại đúng lúc cần thất "
              "bại**. Phép kiểm luôn cho kết quả tốt và phép kiểm bị hỏng nhìn giống nhau "
              "y hệt."], XANH),
          PageBreak()]
    return r


# ---------------------------------------------------------------- PHAN VI

def phan_vi():
    r = phan("VI", "Lỗi trong phần mềm của bạn",
             "Phần mà hầu hết tài liệu DevOps bỏ qua")

    r += [tua(12, "Thiết kế thông báo lỗi"),
          P("Ba sự cố cuối không thuộc về công cụ. Chúng thuộc về mã nguồn chúng tôi tự "
            "viết, và tôi để chúng ở cuối vì chúng tốn nhiều thời gian nhất — không phải "
            "để sửa, mà để **tìm ra**."),
          P("Bối cảnh: trang khám phá phim hiện ra *0 phim*. Không lỗi, không cảnh báo. "
            "Suốt một thời gian dài không ai nghĩ đó là lỗi.")]

    r += [h3("SC-17 · Nuốt cả nhóm lỗi thành kết quả rỗng"),
          khoi_ma("// Sai: moi loi 4xx thanh danh sach rong\n"
                  ".onStatus(status -> status.is4xxClientError(), (req, res) -> {})\n\n"
                  "// Dung: chi 404 la \"khong co ban ghi\"\n"
                  ".onStatus(status -> status.value() == 404, (req, res) -> {})",
                  "Một dòng, và ba tuần chẩn đoán sai hướng"),
          P("Ý định ban đầu hợp lý: không tìm thấy thì trả rỗng. Nhưng `is4xxClientError()` "
            "gộp luôn 401 (khoá bị từ chối) và 429 (gọi quá nhiều) vào cùng một rổ với 404. "
            "Cả ba hiện ra giống hệt nhau trên giao diện."),
          P("Hậu quả không phải một lỗi hiển thị. Nó là **ba tuần đi sai hướng**: người "
            "dùng chỉnh bộ lọc, đổi từ khoá, nghi ngờ nguồn dữ liệu — trong khi nguyên nhân "
            "thật là một cái khoá đặt sai ô, và hệ thống biết điều đó ngay từ lần gọi đầu "
            "tiên nhưng đã chọn không nói."),
          h3("SC-18 · Buộc hai tầng vào nhau bằng nguyên văn thông báo"),
          hop("TRIỆU CHỨNG", [
              "Giao diện dò chuỗi tiếng Anh trong ngoại lệ của tầng dưới để quyết định hiển "
              "thị gì:"], DO),
          khoi_ma("// Rat de vo: sua loi nhan la am tham lam hong cho nay\n"
                  "const biChan = thongBao.includes(\"terminated the handshake\")\n"
                  "            || thongBao.includes(\"I/O error\");"),
          P("Đoạn này chạy đúng — cho tới lần đầu ai đó viết lại thông báo lỗi cho dễ hiểu "
            "hơn. Lúc ấy phần gợi ý biến mất, không có lỗi biên dịch, không có kiểm thử nào "
            "đỏ. Chúng tôi đã tự tạo ra một mối phụ thuộc mà chẳng công cụ nào nhìn thấy."),
          P("Cách chữa là cho tầng dưới phát ra một **mã lỗi ổn định**, và tầng trên đọc "
            "mã đó thay vì đọc câu chữ:"),
          khoi_ma("// Tang duoi: phan loai roi gan ma rieng\n"
                  "public static final String BLOCKED = \"UPSTREAM_BLOCKED\";\n\n"
                  "// Tang tren: doc ma, khong doc cau chu\n"
                  "if (loi.code !== \"UPSTREAM_BLOCKED\") return undefined;",
                  "Hợp đồng giữa hai tầng nên là mã, không phải văn bản"),
          hop("NGUYÊN TẮC", [
              "Thông báo lỗi dành cho con người và mã lỗi dành cho máy là hai thứ khác "
              "nhau. Trộn chúng lại thì bạn không sửa được câu chữ nữa mà không sợ vỡ, và "
              "cuối cùng câu chữ sẽ cứ dở mãi."], XANH)]

    r += [h3("SC-19 · Lời khuyên đúng một lần, rồi sai mãi"),
          hop("TRIỆU CHỨNG", [
              "Mọi trang lỗi đều khuyên *kiểm tra backend đã chạy tại localhost:8080 chưa*, "
              "kể cả khi backend đang chạy hoàn hảo và thứ hỏng là dịch vụ bên ngoài."], DO),
          P("Câu đó đúng vào ngày nó được viết, trên máy của lập trình viên. Sau khi đóng "
            "gói và triển khai, nó thành lời khuyên sai — dẫn người dùng đi kiểm tra đúng "
            "thứ đang hoạt động bình thường."),
          P("Cùng loại với nó là một liên kết `http://localhost:8080/swagger-ui.html` nằm "
            "trong thanh bên. Chúng tôi bỏ hẳn liên kết đó thay vì sửa: muốn nó đúng thì "
            "phải nhồi địa chỉ backend vào lúc dựng, tức là quay lại đúng SC-10."),
          khoi_ma("// Chi khuyen kiem backend khi that su khong goi duoc backend\n"
                  "<ErrorState\n"
                  "  message={loiNhan}\n"
                  "  unreachable={laKhongGoiDuoc(loi)}\n"
                  "  hint={goiYBiChan(loi)}\n"
                  "/>",
                  "Lời khuyên phải phụ thuộc vào nguyên nhân"),
          hop("BÀI HỌC", [
              "Mỗi câu hướng dẫn cố định trong thông báo lỗi là một giả định về môi trường. "
              "Hãy rà lại chúng mỗi lần môi trường đổi — và nếu một câu không thể luôn đúng, "
              "hãy bỏ nó đi thay vì để nó gây nhầm."], XANH),
          PageBreak()]
    return r


# ---------------------------------------------------------------- PHU LUC

def phu_luc():
    r = [tua("Phụ lục A", "Bảng tra cứu nhanh"),
         P("Tra theo triệu chứng. Số hiệu dẫn tới phần trình bày đầy đủ trong sách.")]

    r += [bang(["Bạn thấy gì", "Nguyên nhân thật", "Xem"],
               [["Commit nằm sai nhánh", "Quên tạo nhánh trước khi làm", "SC-01"],
                ["Đường dẫn cũ vẫn trả về 200 sau khi xoá",
                 "Giải nén đè không xoá tệp đã bỏ", "SC-02"],
                ["`403` dù bạn là chủ sở hữu", "Thẻ xác thực thiếu phạm vi quyền", "SC-04"],
                ["Đã sửa mà lỗi vẫn còn", "Pull request mở nhưng chưa hợp nhất", "SC-05"],
                ["`no checks reported`", "Quy trình không kích hoạt trên pull request",
                 "SC-06"],
                ["Dòng lệnh hỏi `Uri:`", "`curl` là bí danh của `Invoke-WebRequest`",
                 "SC-07"],
                ["Lệnh vừa gõ không chạy", "Dấu nhắc cũ nuốt mất nó", "SC-08"],
                ["`AccessDeniedException` trên volume",
                 "Volume kế thừa quyền sai, cần bỏ volume cũ", "SC-09"],
                ["Trang trắng, dữ liệu rỗng, log sạch",
                 "Địa chỉ nướng vào ảnh lúc dựng", "SC-10"],
                ["Container mãi `unhealthy`", "Ảnh nền thiếu `wget` hoặc `curl`", "SC-11"],
                ["`no match for platform in manifest`",
                 "Ảnh nền không có kiến trúc đó", "SC-12"],
                ["Nhãn chỉ còn một kiến trúc",
                 "Các máy dựng ghi đè nhãn của nhau", "SC-13"],
                ["Thời gian dựng thất thường",
                 "Bộ nhớ đệm dùng chung giữa hai kiến trúc", "SC-14"],
                ["Người khác nhận `denied` khi kéo ảnh",
                 "Gói mặc định riêng tư, khác quyền của kho mã", "SC-15"],
                ["Kết quả 0 bản ghi nhưng nguồn vẫn tốt",
                 "Mã nuốt cả nhóm lỗi thành rỗng", "SC-17"],
                ["Gợi ý trên giao diện tự biến mất",
                 "Giao diện dò theo nguyên văn thông báo", "SC-18"],
                ["Thông báo lỗi khuyên sai hướng",
                 "Lời khuyên cố định không theo nguyên nhân", "SC-19"]],
               [155, 190, 45]),
          PageBreak()]

    r += [tua("Phụ lục B", "Danh mục kiểm trước khi phát hành"),
          P("Danh mục này rút ra từ chính những lần đã sai. Mỗi dòng tương ứng với một sự "
            "cố có thật ở trên."),
          h2("Trước khi hợp nhất"),
          cham([
              "Đang ở nhánh phụ, không phải nhánh chính. — SC-01",
              "Đã chạy kiểm thử và lint tại máy, vì pull request có thể không có phép kiểm "
              "nào. — SC-06",
              "Mọi khẳng định trong mô tả thay đổi đều đã được kiểm, không dựa vào trí nhớ. "
              "— SC-12",
          ]),
          h2("Trước khi tin rằng ảnh dùng được"),
          cham([
              "`imagetools inspect` cho thấy đủ các kiến trúc dự định. — SC-13",
              "Không có địa chỉ mạng nội bộ nào nằm trong ảnh. — SC-10",
              "Thư mục dữ liệu đã `chown` trước dòng `USER`. — SC-09",
              "Lệnh trong `HEALTHCHECK` thật sự tồn tại trong ảnh nền. — SC-11",
              "`.dockerignore` có `.git`, `node_modules`, `.env`. — mục 7.4",
          ]),
          h2("Trước khi nói người khác cài được"),
          cham([
              "Phép thử token ẩn danh cho thấy gói công khai. — SC-15",
              "Đã đối chứng phép thử đó trên một ảnh biết chắc là công khai. — SC-16",
              "Địa chỉ ảnh trong hướng dẫn khớp với địa chỉ quy trình thật sự đẩy lên.",
          ]),
          h2("Trước khi nói xong"),
          cham([
              "Đã đọc trạng thái thật của hệ thống bằng một lệnh, không dựa vào trí nhớ. "
              "— SC-05",
              "Đã nói rõ phần nào *chưa* kiểm được, và vì sao.",
          ]),
          PageBreak()]

    r += [tua("Phụ lục C", "Lệnh dùng thường xuyên"),
          h2("Git"),
          khoi_ma("git switch -c ten-nhanh              # tao va chuyen sang nhanh moi\n"
                  "git reflog                           # tim lai commit tuong da mat\n"
                  "git rev-parse main origin/main       # main da khop may chu chua\n"
                  "git log --oneline -5                 # nam commit gan nhat"),
          h2("GitHub CLI"),
          khoi_ma("gh auth status                       # xem pham vi quyen hien co\n"
                  "gh pr create --base main --body-file -\n"
                  "gh pr view <so> --json state,mergedAt\n"
                  "gh pr merge <so> --squash --delete-branch\n"
                  "gh run list --limit 5\n"
                  "gh run view <id> --json conclusion,jobs\n"
                  "gh run watch <id> --exit-status"),
          h2("Docker"),
          khoi_ma("docker buildx imagetools inspect <anh>:latest\n"
                  "docker volume ls\n"
                  "docker volume rm <ten-volume>        # bo volume giu quyen sai\n"
                  "docker logs <container> --tail 50\n"
                  "docker compose ps                    # xem trang thai healthy"),
          h2("Kiểm registry mà không cần đăng nhập"),
          khoi_ma("curl.exe -s \"https://ghcr.io/token?service=ghcr.io\n"
                  "&scope=repository:chu/anh:pull\"\n\n"
                  "curl.exe -s \"https://auth.docker.io/token?service=registry.docker.io\n"
                  "&scope=repository:library/ten-anh:pull\""),
          Spacer(1, 20),
          P("<i>Hết.</i>", "bia-nho")]
    return r
