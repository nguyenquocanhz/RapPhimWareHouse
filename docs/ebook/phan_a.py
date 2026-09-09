# -*- coding: utf-8 -*-
"""Noi dung: bia, loi mo, nguyen tac, Git, GitHub CLI."""
from reportlab.platypus import PageBreak, Paragraph, Spacer
from render import DO, MUC, NHAT, S, XANH, bang, cham, hop, khoi_ma, P, mk


def tua(so, ten):
    return Paragraph(mk("%s. %s" % (so, ten)), S["h1"])


def h2(t):
    return Paragraph(mk(t), S["h2"])


def h3(t):
    return Paragraph(mk(t), S["h3"])


def phan(so, ten, dan):
    return [Spacer(1, 150), Paragraph(mk("PHẦN %s" % so), S["phansub"]),
            Paragraph(mk(ten), S["phan"]), Paragraph(mk(dan), S["phansub"]),
            PageBreak()]


def bia():
    return [
        Spacer(1, 110),
        Paragraph("TỪ COMMIT ĐẾN CONTAINER", S["bia-ten"]),
        Spacer(1, 18),
        Paragraph("Mười chín sự cố có thật, và những nguyên tắc rút ra từ chúng",
                  S["bia-phu"]),
        Spacer(1, 60),
        Paragraph("Git &bull; GitHub CLI &bull; Dockerfile &bull; Ảnh Docker &bull; CI/CD",
                  S["bia-nho"]),
        Spacer(1, 150),
        Paragraph("Ghi chép từ nhật ký triển khai dự án <b>RapPhim WareHouse</b>",
                  S["bia-nho"]),
        Paragraph("nguyenquocanhz", S["bia-nho"]),
        Spacer(1, 6),
        Paragraph("Tháng 9, 2026", S["bia-nho"]),
        PageBreak(),
    ]


def ve_quyen_sach():
    return [
        Paragraph("Về quyển này", S["h1"]),
        P("Phần lớn tài liệu kỹ thuật dạy bạn con đường thẳng: gõ lệnh này, được kết "
          "quả kia. Quyển này đi đường ngược lại. Nó chỉ viết về những lúc con đường "
          "thẳng ấy gãy, vì đó mới là chỗ người ta thật sự học được nghề."),
        P("Toàn bộ sự cố trong sách là có thật, lấy từ nhật ký một lần đưa dự án lên "
          "máy chủ thật: một trang xem phim gồm backend Spring Boot và frontend Next.js, "
          "đóng gói bằng Docker, phát hành qua GitHub Actions. Không có ví dụ nào được "
          "bịa ra cho đẹp bài. Thông báo lỗi trong sách là thông báo lỗi thật, đã chép "
          "nguyên văn."),
        P("Tôi viết ở ngôi thứ nhất, giọng của người chịu trách nhiệm cho kết quả cuối "
          "chứ không phải người đứng ngoài giảng giải. Vì bài học thật sự của mỗi sự cố "
          "hiếm khi nằm ở câu lệnh sửa lỗi. Nó nằm ở câu hỏi: *vì sao chúng ta không thấy "
          "sớm hơn?*"),
        h2("Cách đọc"),
        P("Mỗi sự cố được đánh số **SC-nn** và trình bày theo cùng một khuôn: triệu chứng, "
          "thông báo lỗi nguyên văn, chẩn đoán, cách khắc phục, rồi nguyên tắc rút ra. "
          "Bạn có thể đọc tuần tự như một quyển sách, hoặc tra theo Phụ lục A khi đang "
          "gặp đúng lỗi đó."),
        cham([
            "**Phần I** nêu năm nguyên tắc chi phối toàn bộ phần còn lại.",
            "**Phần II–III** về Git và GitHub CLI: nơi sai lầm còn rẻ.",
            "**Phần IV–V** về Docker và phát hành: nơi sai lầm bắt đầu đắt.",
            "**Phần VI** về lỗi trong chính phần mềm bạn viết — phần nhiều người bỏ qua.",
        ]),
        h2("Một lời thú nhận"),
        P("Trong số các sự cố dưới đây, có vài cái do chính tôi gây ra bằng cách khẳng "
          "định một điều mà tôi chưa kiểm chứng. Tôi giữ nguyên chúng trong sách, kể cả "
          "phần khó coi. Một quyển sổ sự cố mà tác giả lúc nào cũng đúng thì không phải "
          "sổ sự cố — nó là quảng cáo."),
        PageBreak(),
    ]


def muc_luc_trang(toc):
    return [Paragraph("Mục lục", S["h1"]), Spacer(1, 6), toc, PageBreak()]


# ---------------------------------------------------------------- PHAN I

def phan_i():
    r = phan("I", "Năm nguyên tắc",
             "Những điều tôi ước mình biết trước khi gõ lệnh đầu tiên")

    r += [tua(1, "Năm nguyên tắc"),
          P("Trước khi đi vào từng lệnh, tôi muốn nói về năm điều chi phối mọi thứ còn "
            "lại. Chúng không phải mẹo vặt. Chúng là cách tôi quyết định nên tin cái gì, "
            "nên kiểm cái gì, và khi nào thì được phép nói *xong rồi*.")]

    r += [h2("1.1 Lỗi im lặng đắt hơn lỗi ồn ào"),
          P("Trong dự án này có một đoạn mã nuốt mọi lỗi 4xx từ dịch vụ bên ngoài rồi trả "
            "về danh sách rỗng. Ý định ban đầu rất hợp lý: khi không tìm thấy bản ghi thì "
            "trả rỗng, đừng làm sập trang."),
          P("Nhưng *không tìm thấy* (404) và *khoá của bạn bị từ chối* (401) là hai chuyện "
            "khác nhau hoàn toàn. Gộp chúng lại, giao diện hiện ra dòng chữ hiền lành "
            "**“0 phim”**. Người dùng nhìn thấy con số 0 và đi chỉnh bộ lọc tìm kiếm — "
            "trong khi lỗi thật nằm ở một cái khoá đặt sai chỗ, cách đó ba tầng."),
          hop("NGUYÊN TẮC 1", [
              "Một hệ thống im lặng khi hỏng sẽ tiêu tốn thời gian của con người nhiều "
              "hơn bất kỳ lỗi nào chịu kêu lên. Hãy nuốt đúng một trường hợp bạn thật sự "
              "hiểu, và để mọi trường hợp còn lại kêu to."], XANH)]

    r += [h2("1.2 Đo, đừng đoán"),
          P("Khi thêm hỗ trợ kiến trúc ARM cho ảnh Docker, tôi viết trong mô tả thay đổi "
            "rằng *cả ba ảnh nền đều có sẵn bản arm64*. Tôi không kiểm. Tôi nhớ là như "
            "vậy, và điều đó nghe rất hợp lý."),
          P("Bản Alpine của Eclipse Temurin chỉ phát hành cho amd64. Lần dựng đầu tiên "
            "hỏng đúng ở đó. Nếu tôi bỏ ra ba mươi giây gọi API của registry, tôi đã biết "
            "trước — và đã không phải sửa sau khi mọi thứ đã lên nhánh chính."),
          P("Chuyện này lặp lại lần thứ hai trong cùng dự án, theo hướng ngược lại. Khi "
            "chọn ảnh thay thế, trực giác nói *Alpine thì nhẹ hơn*. Tôi đo thử: bản Alpine "
            "của một nhà phát hành nặng **145 MB**, trong khi bản nền Ubuntu của nhà khác "
            "chỉ **89 MB**, vì bản Alpine kia đóng gói cả bộ công cụ biên dịch. Nếu đi "
            "theo trực giác, tôi đã làm ảnh phồng lên gấp ba."),
          P("Và lần thứ ba, ngay khi dựng chính quyển sách này: tôi chọn một phông chữ rồi "
            "kiểm bằng cách đo bề rộng chuỗi. Phép đo trả về số đẹp, nên tôi tin là xong. "
            "Trang bìa in ra thì chữ có dấu biến thành ô vuông — bề rộng vẫn có số kể cả "
            "khi phông không hề chứa ký tự đó. Tôi đã đo, nhưng đo nhầm thứ."),
          hop("NGUYÊN TẮC 2", [
              "Trong hạ tầng, trực giác là giả thuyết chứ không phải dữ kiện. Cái giá của "
              "một phép đo luôn rẻ hơn cái giá của một lần dựng hỏng. Nhưng hãy kiểm cả "
              "chính phép đo: một phép đo sai còn nguy hiểm hơn không đo, vì nó cho bạn "
              "sự tự tin."], XANH)]

    r += [h2("1.3 Thông báo lỗi là giao diện người dùng"),
          P("Trang lỗi của chúng tôi luôn khuyên: *Kiểm tra backend đã chạy tại "
            "localhost:8080 chưa*. Câu đó đúng vào ngày nó được viết, trên máy của lập "
            "trình viên. Sau khi đóng gói Docker và đưa lên máy chủ, backend chạy hoàn "
            "toàn bình thường ở một địa chỉ khác, còn thứ hỏng là dịch vụ bên ngoài."),
          P("Kết quả: mỗi lần có sự cố, lời khuyên đầu tiên người dùng đọc được lại dẫn họ "
            "đi sai hướng. Thông báo lỗi không phải là chỗ đổ ngoại lệ ra cho xong. Nó là "
            "màn hình mà người dùng gặp đúng vào lúc họ bối rối nhất."),
          hop("NGUYÊN TẮC 3", [
              "Hãy đọc thông báo lỗi của bạn bằng con mắt của người chưa từng đọc mã "
              "nguồn. Nếu nó không nói được *phải làm gì tiếp theo*, nó chưa xong."], XANH)]

    r += [h2("1.4 Việc chưa merge là việc chưa xong"),
          P("Tôi từng sửa xong một lỗi, mở pull request, viết mô tả cẩn thận, rồi báo lại "
            "rằng đã xử lý. Người đối diện trả lời gọn lỏn: *chưa xong lỗi kìa*. Họ đúng. "
            "Nhánh chính vẫn giữ nguyên đoạn mã hỏng. Pull request đang mở là một **đề "
            "nghị**, không phải một thay đổi."),
          P("Đây là loại nhầm lẫn rất dễ mắc khi bạn đo tiến độ bằng công sức đã bỏ ra "
            "thay vì bằng trạng thái của hệ thống. Câu hỏi đúng không bao giờ là *tôi đã "
            "làm gì*, mà là *hệ thống bây giờ đang ở trạng thái nào*."),
          hop("NGUYÊN TẮC 4", [
              "Chỉ có hai trạng thái: đã vào nhánh chính và đang chạy, hoặc chưa. Mọi thứ "
              "ở giữa đều là việc dở dang, dù bạn đã bỏ vào đó bao nhiêu công."], XANH)]

    r += [h2("1.5 Không lách hàng rào an toàn"),
          P("Vài lần trong dự án, một thao tác bị chặn: đọc tệp chứa khoá bí mật, chuyển "
            "một gói riêng tư thành công khai. Trong cả hai trường hợp, tôi dừng lại và "
            "báo cho người có quyền quyết định, thay vì tìm đường vòng."),
          P("Điều thú vị là việc chẩn đoán vẫn hoàn thành được mà không cần vượt rào. Để "
            "biết một khoá có đặt sai ô hay không, tôi không cần đọc giá trị của nó — chỉ "
            "cần xét **dạng** của nó. Khoá v3 là 32 ký tự hệ mười sáu; token v4 là chuỗi "
            "JWT bắt đầu bằng `eyJ`. Bấy nhiêu là đủ để kết luận, mà không có bí mật nào "
            "rời khỏi chỗ của nó."),
          hop("NGUYÊN TẮC 5", [
              "Khi gặp hàng rào, hãy hỏi liệu có cách đạt mục tiêu mà không cần tháo rào "
              "hay không. Thường là có, và cách đó còn tốt hơn. Nếu không có, hãy để người "
              "chịu trách nhiệm quyết định — đừng tự quyết thay họ."], XANH),
          PageBreak()]
    return r


# ---------------------------------------------------------------- PHAN II

def phan_ii():
    r = phan("II", "Git", "Nơi sai lầm còn rẻ")

    r += [tua(2, "Mô hình dữ liệu, và vì sao nó cứu bạn"),
          P("Hầu hết nỗi sợ khi dùng Git đến từ việc coi nó như một cỗ máy bí ẩn. Thực ra "
            "mô hình của nó nhỏ đến bất ngờ, và hiểu nó là cách duy nhất để sửa sai một "
            "cách bình tĩnh.")]

    r += [h2("2.1 Commit là ảnh chụp, không phải bản vá"),
          P("Nhiều người hình dung commit là *tập hợp các thay đổi*. Không phải. Mỗi commit "
            "là một **ảnh chụp toàn bộ cây thư mục** tại một thời điểm, cộng với con trỏ "
            "tới commit cha. Phần khác biệt mà bạn thấy khi chạy `git diff` là thứ Git "
            "tính ra khi so hai ảnh chụp, chứ không phải thứ nó lưu."),
          P("Hệ quả rất thực dụng: một commit đã tạo ra thì nội dung của nó không mất, kể "
            "cả khi không còn nhánh nào trỏ tới. Đó là nền tảng của mọi thao tác cứu hộ ở "
            "chương sau."),
          h2("2.2 Nhánh chỉ là một con trỏ"),
          P("Một nhánh trong Git là một tệp văn bản chứa mã băm của một commit. Chỉ vậy "
            "thôi. Tạo nhánh là ghi 41 byte; xoá nhánh là xoá 41 byte đó. Điều này giải "
            "thích vì sao tạo nhánh trong Git gần như miễn phí, và vì sao *xoá nhầm nhánh* "
            "hiếm khi là thảm hoạ — commit vẫn còn nguyên, chỉ là không còn tên gọi."),
          khoi_ma("git branch tinh-nang-moi        # tao con tro moi tai HEAD\n"
                  "git switch tinh-nang-moi        # doi HEAD sang tro vao nhanh do\n"
                  "git switch -c tinh-nang-moi     # gop hai buoc tren lam mot",
                  "Ba lệnh cơ bản, và điều chúng thật sự làm"),
          h2("2.3 Ba vùng cần phân biệt"),
          bang(["Vùng", "Là gì", "Lệnh nhìn vào nó"],
               [["Cây làm việc", "Tệp thật trên đĩa, thứ trình soạn thảo đang mở",
                 "`git status`"],
                ["Vùng đệm (index)", "Nội dung đã chọn cho commit kế tiếp",
                 "`git diff --staged`"],
                ["HEAD", "Ảnh chụp của commit hiện tại", "`git show HEAD`"]],
               [80, 230, 120]),
          P("Gần như mọi lệnh Git khiến bạn bối rối đều trở nên dễ hiểu khi bạn hỏi: lệnh "
            "này đụng vào vùng nào trong ba vùng trên? `git reset --soft` chỉ dời HEAD. "
            "`--mixed` dời HEAD và xoá vùng đệm. `--hard` dời cả ba, và đó là lệnh duy nhất "
            "trong nhóm có thể làm mất công việc chưa commit."),
          PageBreak()]

    r += [tua(3, "Sổ sự cố Git"),
          P("Ba sự cố dưới đây đều xảy ra trong một tuần triển khai. Không cái nào là lỗi "
            "hiếm gặp; tất cả đều thuộc loại ai làm lâu cũng gặp ít nhất một lần.")]

    r += [h3("SC-01 · Commit rơi thẳng vào nhánh chính"),
          hop("TRIỆU CHỨNG", [
              "Sửa xong một tệp, commit, rồi mới nhận ra `git branch --show-current` trả "
              "về `main`. Thay đổi đã nằm trong lịch sử của nhánh chính, chưa qua rà soát "
              "nào."], DO),
          P("Đây là sự cố lành tính **nếu bạn phát hiện trước khi đẩy lên máy chủ**. Vì "
            "nhánh chỉ là con trỏ, việc cần làm là tạo một con trỏ mới tại chỗ đang đứng, "
            "rồi kéo con trỏ `main` lùi lại."),
          khoi_ma("git branch tinh-nang-moi     # dat ten cho cong viec vua commit\n"
                  "git reset --hard <ma-commit-truoc-do>\n"
                  "git switch tinh-nang-moi\n\n"
                  "# Xac nhan main da khop lai voi may chu:\n"
                  "git rev-parse main origin/main | uniq -c   # ra mot dong = khop",
                  "Cách gỡ, theo đúng thứ tự"),
          P("Thứ tự quan trọng. Phải tạo nhánh **trước** khi reset; làm ngược lại thì "
            "commit mất tên và bạn phải đi tìm nó trong `git reflog`. Và chỉ dùng cách này "
            "khi chưa đẩy lên: một khi người khác đã kéo về, việc viết lại lịch sử chuyển "
            "gánh nặng sang họ."),
          hop("PHÒNG NGỪA", [
              "Bật bảo vệ nhánh chính trên máy chủ, để chính máy chủ từ chối. Một quy ước "
              "chỉ tồn tại trong đầu người ta là quy ước sẽ bị quên vào lúc bận nhất."],
              XANH)]

    r += [h3("SC-02 · Tệp đã xoá vẫn sống trên máy chủ"),
          hop("TRIỆU CHỨNG", [
              "Đổi tên một đường dẫn từ `/quan-tri` sang `/cms`, triển khai, nhưng đường "
              "dẫn cũ vẫn trả về mã 200. Trên máy phát triển thì không còn dấu vết nào."],
              DO),
          P("Kịch bản triển khai đóng gói mã nguồn bằng `tar` rồi giải nén đè lên thư mục "
            "trên máy chủ. Giải nén đè chỉ **ghi thêm và ghi đè** — nó không bao giờ xoá. "
            "Mọi tệp bạn đã xoá ở máy mình vẫn nằm nguyên ở đích, và với một khung như "
            "Next.js vốn sinh đường dẫn từ cấu trúc thư mục, tệp cũ còn nghĩa là đường dẫn "
            "cũ còn."),
          khoi_ma("# Sai: chi phu len, khong bao gio don\n"
                  "tar -xzf ban-moi.tar.gz -C /opt/ung-dung\n\n"
                  "# Dung: don sach thu muc ma nguon truoc khi giai nen\n"
                  "rm -rf /opt/ung-dung/backend /opt/ung-dung/frontend\n"
                  "tar -xzf ban-moi.tar.gz -C /opt/ung-dung",
                  "Vì sao bản triển khai cũ vẫn còn sống"),
          hop("BÀI HỌC", [
              "Bất kỳ cơ chế triển khai nào hoạt động theo kiểu *phủ lên* đều mang sẵn "
              "khuyết tật này. Hãy hỏi: nếu tôi xoá một tệp, cơ chế này có xoá nó ở đích "
              "không? Nếu câu trả lời là không, bạn đang tích luỹ một tầng rác âm thầm."],
              XANH)]

    r += [h3("SC-03 · Ba công cụ sửa sai, và khi nào dùng cái nào"),
          P("Người mới thường học `reset --hard` rồi dùng nó cho mọi tình huống. Đó là con "
            "dao sắc nhất trong hộp, và cũng là con dễ đứt tay nhất."),
          bang(["Công cụ", "Làm gì", "Dùng khi"],
               [["`git reset`", "Dời con trỏ nhánh, có thể bỏ công việc chưa commit",
                 "Chưa đẩy lên, muốn lịch sử sạch"],
                ["`git revert`", "Tạo commit mới đảo ngược một commit cũ",
                 "Đã đẩy lên, người khác đã có bản đó"],
                ["`git reflog`", "Nhật ký mọi vị trí HEAD từng đứng",
                 "Đã lỡ tay và cần tìm lại commit"]],
               [80, 195, 155]),
          P("`git reflog` là lưới an toàn ít người biết đến. Nó ghi lại mọi lần HEAD dịch "
            "chuyển trong khoảng ba mươi ngày, kể cả những commit không còn nhánh nào trỏ "
            "tới. Gần như mọi tình huống *tôi làm mất commit rồi* đều giải được bằng nó."),
          khoi_ma("git reflog                       # tim dong co ma commit can cuu\n"
                  "git switch -c cuu-ho <ma-commit> # dat lai cho no mot cai ten",
                  "Cứu một commit tưởng đã mất"),
          PageBreak()]
    return r


# ---------------------------------------------------------------- PHAN III

def phan_iii():
    r = phan("III", "GitHub CLI", "Khi dòng lệnh gặp dịch vụ đám mây")

    r += [tua(4, "Xác thực và phạm vi quyền"),
          P("`gh` là GitHub gói trong một lệnh. Nó rút ngắn rất nhiều thao tác, nhưng mang "
            "theo một khái niệm mà giao diện web che đi mất: **phạm vi quyền** của thẻ "
            "xác thực."),
          P("Thẻ xác thực của bạn không phải chìa khoá vạn năng. Nó mang một danh sách "
            "phạm vi cụ thể, và một thao tác nằm ngoài danh sách đó sẽ bị từ chối — kể cả "
            "khi tài khoản của bạn thừa quyền làm việc ấy trên web."),
          h3("SC-04 · Thiếu phạm vi quyền"),
          hop("TRIỆU CHỨNG",
              ["Gọi API qua `gh` và nhận về lỗi 403 dù bạn là chủ sở hữu:"], DO),
          khoi_ma("You need at least read:packages scope to get a package.  (HTTP 403)"),
          P("Thông báo này thuộc loại tử tế hiếm gặp: nó nói thẳng thiếu phạm vi nào. Cách "
            "sửa là xin bổ sung, và `gh` sẽ mở trình duyệt cho bạn duyệt lại."),
          khoi_ma("gh auth refresh --scopes read:packages,write:packages\n"
                  "gh auth status                 # kiem lai danh sach pham vi hien co",
                  "Bổ sung phạm vi cho thẻ hiện tại"),
          hop("BÀI HỌC", [
              "Khi một thao tác bị từ chối, hãy phân biệt ba nguyên nhân trước khi sửa: "
              "tài khoản không đủ quyền, thẻ không đủ phạm vi, hay đối tượng không tồn "
              "tại. Ba nguyên nhân này có cách xử lý khác hẳn nhau, mà đều hiện ra dưới "
              "dạng một con số 403 hoặc 404 giống nhau."], XANH),
          PageBreak()]

    r += [tua(5, "Vòng đời một pull request"),
          P("Từ dòng lệnh, cả vòng đời của một thay đổi gói gọn trong bốn lệnh. Cái bẫy "
            "không nằm ở lệnh nào khó, mà ở chỗ dễ tưởng mình đã đi hết vòng."),
          khoi_ma("git switch -c sua-loi-abc\n"
                  "git commit -am \"Mo ta ngan gon viec da lam\"\n"
                  "git push -u origin sua-loi-abc\n"
                  "gh pr create --base main --title \"...\" --body-file -\n"
                  "gh pr merge <so> --squash --delete-branch",
                  "Toàn bộ vòng đời"),
          h3("SC-05 · Pull request mở, nhưng lỗi vẫn còn"),
          hop("TRIỆU CHỨNG", [
              "Bạn báo cáo đã sửa xong. Người khác kiểm tra và thấy lỗi vẫn nguyên vẹn "
              "trên nhánh chính."], DO),
          P("Tôi đã mắc đúng lỗi này. Pull request được mở, mô tả viết kỹ, kiểm thử chạy "
            "sạch — nhưng nhánh chính chưa hề thay đổi. Một pull request đang mở là lời đề "
            "nghị chờ người khác đồng ý, không phải một sự thật đã xảy ra."),
          khoi_ma("gh pr view <so> --json state,mergedAt\n"
                  "gh run list --limit 3          # nhanh chinh da chay lai chua?",
                  "Kiểm tra trạng thái thật thay vì trí nhớ"),
          hop("NGUYÊN TẮC", [
              "Trước khi nói *xong rồi*, hãy chạy một lệnh đọc trạng thái thật của hệ "
              "thống. Trí nhớ về việc mình vừa làm không phải bằng chứng."], XANH)]

    r += [h3("SC-06 · Không có kiểm thử tự động nào chạy trên pull request"),
          hop("TRIỆU CHỨNG", ["`gh pr checks` trả về:"], DO),
          khoi_ma("no checks reported on the 'ten-nhanh' branch"),
          P("Nguyên nhân gần như luôn nằm ở phần khai báo sự kiện kích hoạt của quy trình. "
            "Một quy trình chỉ khai báo `on: push: branches: [main]` sẽ **không bao giờ** "
            "chạy cho pull request. Nghĩa là mọi thay đổi vào quy trình đó chỉ được kiểm "
            "chứng *sau khi* đã hợp nhất — đúng lúc sửa sai đắt nhất."),
          khoi_ma("on:\n"
                  "  push:\n"
                  "    branches: [main]\n"
                  "  pull_request:            # them dong nay de PR cung duoc kiem\n"
                  "    branches: [main]",
                  "Cho quy trình chạy cả trên pull request"),
          hop("BÀI HỌC", [
              "Một pull request màu xanh không có nghĩa là đã kiểm thử. Nó có thể chỉ có "
              "nghĩa là chưa ai kiểm gì cả. Hãy phân biệt *không có lỗi* với *không có "
              "phép thử nào*."], XANH),
          PageBreak()]

    r += [tua(6, "Sự cố môi trường dòng lệnh"),
          P("Hai sự cố dưới đây không thuộc về Git hay Docker. Chúng thuộc về cái vỏ bọc "
            "quanh mọi thứ: trình thông dịch dòng lệnh. Chúng chiếm một lượng thời gian "
            "hoang phí lớn hơn nhiều so với mức người ta thừa nhận."),
          h3("SC-07 · `curl` trong PowerShell không phải `curl`"),
          hop("TRIỆU CHỨNG", [
              "Sao chép một lệnh `curl` từ tài liệu, dán vào PowerShell, và nó hỏi ngược "
              "lại bạn một tham số:"], DO),
          khoi_ma("cmdlet Invoke-WebRequest at command pipeline position 1\n"
                  "Supply values for the following parameters:\n"
                  "Uri:"),
          P("Trong Windows PowerShell, `curl` là bí danh của `Invoke-WebRequest` — một "
            "lệnh hoàn toàn khác, với bộ tham số hoàn toàn khác. Cờ `-s` của curl thật "
            "không tồn tại ở đây, nên chuỗi địa chỉ không gắn được vào tham số nào và lệnh "
            "quay ra hỏi bạn."),
          P("Ký tự `&` trong địa chỉ còn gây rắc rối thứ hai: PowerShell coi nó là ký tự "
            "dành riêng. Cách chữa dứt điểm là gọi thẳng chương trình thật bằng đuôi "
            "`.exe`, và luôn bọc địa chỉ trong dấu nháy."),
          khoi_ma("# Sai trong PowerShell:\n"
                  "curl -s \"https://vi.du/api?a=1&b=2\"\n\n"
                  "# Dung:\n"
                  "curl.exe -s \"https://vi.du/api?a=1&b=2\"",
                  "Gọi đúng chương trình"),
          h3("SC-08 · Dấu nhắc đang chờ nuốt mất lệnh kế tiếp"),
          hop("TRIỆU CHỨNG", [
              "Sau sự cố trên, bạn gõ lệnh tiếp theo và nó không chạy — thay vào đó bạn "
              "nhận một lỗi hoàn toàn không liên quan:"], DO),
          khoi_ma("Uri: gh auth refresh --scopes read:packages\n"
                  "curl : Cannot find drive. A drive with the name 'https' does not exist."),
          P("Cửa sổ dòng lệnh vẫn đang treo ở dấu nhắc `Uri:` từ lệnh hỏng trước đó. Lệnh "
            "`gh` bạn vừa gõ không được thực thi; nó bị nhận làm **giá trị** cho tham số "
            "Uri. Trong ba mươi giây, bạn tin rằng mình đã chạy `gh auth refresh` trong "
            "khi thực tế nó chưa từng chạy."),
          hop("BÀI HỌC", [
              "Khi kết quả không khớp với việc bạn nghĩ mình vừa làm, hãy nghi ngờ **trạng "
              "thái của cửa sổ dòng lệnh** trước khi nghi ngờ hệ thống. Bấm Ctrl+C, xác "
              "nhận đã về dấu nhắc bình thường, rồi mới làm tiếp."], XANH),
          PageBreak()]
    return r
